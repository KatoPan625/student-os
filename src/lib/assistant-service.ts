import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AssistantError,parseAssistantReply,requestAssistant,validateAssistantInput} from './assistant.ts';
import type {AssistantCommand,ScheduleItem} from './assistant.ts';
import type {AssistantState,Subject} from './types.ts';
import {formatDateTime} from './study.ts';
import {SUBJECT_COLORS} from './colors.ts';

type Context={client:SupabaseClient;userId:string;subjects:Subject[];schedule?:ScheduleItem[]};
// The in-process cache only spares Gemini calls on same-instance retries; duplicates are prevented by the request-id
// check in saveAssistantRecord, and the quota lives in Postgres (take_assistant_quota), so both hold across instances.
type RequestEntry={fingerprint:string;expires:number;result?:Promise<AssistantState>;command?:AssistantCommand};
const requests=new Map<string,RequestEntry>();

export const QUOTA_MESSAGE='Bạn đã gửi 10 yêu cầu trong một phút. Hãy chờ một chút rồi thử lại.';
/** Shared per-user Gemini quota (10 calls per minute) kept in Postgres. Fails closed when it cannot be checked. */
export async function takeQuota(client:SupabaseClient):Promise<boolean> {
  try {
    const {data,error}=await client.rpc('take_assistant_quota');
    return !error&&data===true;
  } catch {return false;}
}

/** Deterministic UUID for the i-th session of a series, so a retry targets the same rows instead of duplicating them. */
export function seriesSessionId(requestId:string,index:number):string {
  const hash=createHash('sha256').update(`${requestId}:session:${index}`).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-${((parseInt(hash[16],16)&3)|8).toString(16)}${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

async function readOwned(client:SupabaseClient,table:string,id:string,userId:string):Promise<Record<string,unknown>|null> {
  const {data,error}=await client.from(table).select('*').eq('id',id).eq('user_id',userId).maybeSingle();
  if(error)throw new Error('Chưa kiểm tra được lần lưu trước.');
  return data as Record<string,unknown>|null;
}

/** Creates the requested new subject with id = request id; a retry finds and reuses it. */
async function ensureSubject(client:SupabaseClient,userId:string,requestId:string,name:string,colorIndex:number):Promise<void> {
  const existing=await readOwned(client,'subjects',requestId,userId);
  if(existing) {
    if(existing.name!==name)throw new Error('Mã thao tác đã dùng cho môn khác.');
    return;
  }
  const {error}=await client.from('subjects').insert({id:requestId,user_id:userId,name,code:null,color:SUBJECT_COLORS[colorIndex%SUBJECT_COLORS.length]}).select('id').single();
  if(error?.code==='23505'&&(await readOwned(client,'subjects',requestId,userId))?.name===name)return;
  if(error)throw new Error('Chưa tạo được môn học mới.');
}

export async function saveAssistantRecord(client:SupabaseClient,userId:string,requestId:string,command:AssistantCommand,subjectCount=0):Promise<string> {
  if(command.newSubject)await ensureSubject(client,userId,requestId,command.newSubject,subjectCount);
  if(command.entity==='class_series') {
    const rows=command.sessions.map((session,index)=>({...session,id:seriesSessionId(requestId,index),user_id:userId}));
    const first=await readOwned(client,'class_sessions',rows[0].id,userId);
    // One insert statement saves all rows or none, so the first row tells whether this series was already saved.
    if(first) {
      if(Date.parse(String(first.starts_at))!==Date.parse(rows[0].starts_at))throw new Error('Mã thao tác đã dùng cho nội dung khác.');
      return rows[0].id;
    }
    const {error}=await client.from('class_sessions').insert(rows).select('id');
    if(error?.code==='23505'&&await readOwned(client,'class_sessions',rows[0].id,userId))return rows[0].id;
    if(error)throw new Error('Chưa xác nhận được dữ liệu đã lưu.');
    return rows[0].id;
  }
  const table=command.entity==='task'?'tasks':'class_sessions';
  const other=table==='tasks'?'class_sessions':'tasks';
  const read=(name:string)=>readOwned(client,name,requestId,userId);
  const matches=(row:Record<string,unknown>)=>Object.entries(command.values).every(([key,value])=>
    ['due_at','starts_at','ends_at'].includes(key)?typeof row[key]==='string'&&Date.parse(row[key])===Date.parse(String(value)):row[key]===value);
  if(await read(other))throw new Error('Mã thao tác này đã dùng cho một loại dữ liệu khác.');
  const existing=await read(table);
  if(existing) {
    if(!matches(existing))throw new Error('Mã thao tác đã dùng cho nội dung khác.');
    return requestId;
  }
  const {data,error}=await client.from(table).insert({...command.values,id:requestId,user_id:userId}).select('id').single();
  if(error?.code==='23505') {
    const concurrent=await read(table);
    if(concurrent&&matches(concurrent))return requestId;
  }
  if(error||!data)throw new Error('Chưa xác nhận được dữ liệu đã lưu. Gửi lại cùng yêu cầu để kiểm tra, tránh tự thêm một bản nữa.');
  return requestId;
}

const WEEKDAY_NAMES=['','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
const dateVN=(key:string)=>key.split('-').reverse().join('/');
function summarize(command:AssistantCommand,subjectName:string):string {
  const created=command.newSubject?` (đã tạo môn mới “${subjectName}”)`:'';
  if(command.entity==='task')return `Đã thêm deadline “${command.values.title}” · ${subjectName} · ${formatDateTime(command.values.due_at)}${created}.`;
  if(command.entity==='class_session')return `Đã thêm buổi học ${subjectName} · ${formatDateTime(command.values.starts_at)} – ${formatDateTime(command.values.ends_at)}${command.values.location?` · ${command.values.location}`:''}${created}.`;
  const {weekdays,start,end,from,to,location}=command.values;
  return `Đã tạo ${command.sessions.length} buổi học ${subjectName}: ${[...weekdays].sort().map(day=>WEEKDAY_NAMES[day]).join(', ')} hằng tuần, ${start}–${end}${location?` · ${location}`:''}, từ ${dateVN(from)} đến ${dateVN(to)}${created}.`;
}

export async function processAssistantRequest(input:unknown,authenticate:()=>Promise<Context>,requester:typeof requestAssistant=requestAssistant,now=new Date()):Promise<AssistantState> {
  const {client,userId,subjects,schedule=[]}=await authenticate();
  let validated:ReturnType<typeof validateAssistantInput>;
  try {validated=validateAssistantInput(input);}
  catch(error){return {ok:false,message:error instanceof Error?error.message:'Yêu cầu không hợp lệ.'};}
  const {requestId,messages}=validated;
  const time=now.getTime();
  for(const [key,entry] of requests)if(entry.expires<=time)requests.delete(key);
  const key=`${userId}:${requestId}`;
  const fingerprint=JSON.stringify(messages);
  const previous=requests.get(key);
  if(previous&&previous.fingerprint!==fingerprint)return {ok:false,message:'Yêu cầu đã thay đổi. Hãy gửi thành một tin nhắn mới.'};
  if(previous?.result)return previous.result;
  const entry:RequestEntry=previous??{fingerprint,expires:time+600000};
  const result=(async():Promise<AssistantState>=>{
    // Checked after the entry is registered so concurrent duplicates share one quota slot and one Gemini call;
    // retries that reuse a validated command do not call Gemini and do not spend quota.
    if(!entry.command&&!await takeQuota(client))return {ok:false,message:QUOTA_MESSAGE};
    let parsed:ReturnType<typeof parseAssistantReply>;
    try {parsed=entry.command?{type:'create',command:entry.command}:parseAssistantReply(await requester(messages,subjects,now,fetch,schedule),subjects,requestId);}
    catch(error) {return {ok:false,message:error instanceof AssistantError?error.message:'Gemini trả thông tin chưa hợp lệ. Hãy bổ sung rõ môn, ngày và giờ rồi thử lại.'};}
    if(parsed.type==='reply')return {ok:true,message:parsed.message};
    entry.command=parsed.command;
    try {
      const {command}=parsed;
      const id=await saveAssistantRecord(client,userId,requestId,command,subjects.length);
      const subjectName=command.newSubject??subjects.find(subject=>subject.id===command.values.subject_id)?.name??'môn học';
      return {ok:true,message:summarize(command,subjectName),created:{entity:command.entity==='task'?'task':'class_session',id}};
    } catch {return {ok:false,message:'Chưa xác nhận được dữ liệu đã lưu. Dùng “Thử lại” với cùng yêu cầu để kiểm tra; không cần tự tạo thêm bản nữa.'};}
  })();
  entry.result=result;requests.set(key,entry);
  const outcome=await result;
  if(!outcome.ok){entry.result=undefined;if(!entry.command)requests.delete(key);}
  return outcome;
}
