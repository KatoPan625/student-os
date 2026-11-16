import type {SupabaseClient} from '@supabase/supabase-js';
import {AssistantError,parseAssistantReply,requestAssistant,validateAssistantInput} from './assistant.ts';
import type {AssistantCommand,ScheduleItem} from './assistant.ts';
import type {AssistantState,Subject} from './types.ts';
import {formatDateTime} from './study.ts';

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

export async function saveAssistantRecord(client:SupabaseClient,userId:string,requestId:string,command:AssistantCommand):Promise<string> {
  const table=command.entity==='task'?'tasks':'class_sessions';
  const other=table==='tasks'?'class_sessions':'tasks';
  const read=async(name:string)=>{
    const {data,error}=await client.from(name).select('*').eq('id',requestId).eq('user_id',userId).maybeSingle();
    if(error)throw new Error('Chưa kiểm tra được lần lưu trước.');
    return data as Record<string,unknown>|null;
  };
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
    if(subjects.length===0)return {ok:true,message:'Bạn hãy tạo môn học trước trong mục Môn học, rồi mình sẽ thêm lịch hoặc deadline cho môn đó.'};
    // Checked after the entry is registered so concurrent duplicates share one quota slot and one Gemini call;
    // retries that reuse a validated command do not call Gemini and do not spend quota.
    if(!entry.command&&!await takeQuota(client))return {ok:false,message:QUOTA_MESSAGE};
    let parsed:ReturnType<typeof parseAssistantReply>;
    try {parsed=entry.command?{type:'create',command:entry.command}:parseAssistantReply(await requester(messages,subjects,now,fetch,schedule),subjects);}
    catch(error) {return {ok:false,message:error instanceof AssistantError?error.message:'Gemini trả thông tin chưa hợp lệ. Hãy bổ sung rõ môn, ngày và giờ rồi thử lại.'};}
    if(parsed.type==='reply')return {ok:true,message:parsed.message};
    entry.command=parsed.command;
    try {
      const id=await saveAssistantRecord(client,userId,requestId,parsed.command);
      const {command}=parsed;
      const subject=subjects.find(subject=>subject.id===command.values.subject_id)!;
      const summary=command.entity==='task'
        ?`Đã thêm deadline “${command.values.title}” · ${subject.name} · ${formatDateTime(command.values.due_at)}.`
        :`Đã thêm buổi học ${subject.name} · ${formatDateTime(command.values.starts_at)} – ${formatDateTime(command.values.ends_at)}${command.values.location?` · ${command.values.location}`:''}.`;
      return {ok:true,message:summary,created:{entity:command.entity,id}};
    } catch {return {ok:false,message:'Chưa xác nhận được dữ liệu đã lưu. Dùng “Thử lại” với cùng yêu cầu để kiểm tra; không cần tự tạo thêm bản nữa.'};}
  })();
  entry.result=result;requests.set(key,entry);
  const outcome=await result;
  if(!outcome.ok){entry.result=undefined;if(!entry.command)requests.delete(key);}
  return outcome;
}
