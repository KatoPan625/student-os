import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {saveAssistantRecord,processAssistantRequest,seriesSessionId} from '../src/lib/assistant-service.ts';
import {parseAssistantReply} from '../src/lib/assistant.ts';
import type {Subject} from '../src/lib/types.ts';

const subjectId='11111111-1111-4111-8111-111111111111';
const requestId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const subjects:Subject[]=[{id:subjectId,user_id:'owner-a',name:'Toán',code:null,color:'#805f46',created_at:''}];
const reply={type:'task',subject_id:subjectId,title:'Bài tập Toán',due_at:'2026-10-23T23:00'};
const parsed=parseAssistantReply(reply,subjects);
if(parsed.type!=='create')throw new Error('Invalid fixture');
const command=parsed.command;
function database(fail=false,loseFirstResponse=false) {
  const rows:Record<string,Record<string,unknown>[]>= {tasks:[],class_sessions:[],subjects:[]};
  let writes=0;
  // Stand-in for public.take_assistant_quota(): 10 per window; the real window logic is tested in SQL.
  const quota={used:0,error:false as boolean};
  const client={async rpc(name:string){
    assert.equal(name,'take_assistant_quota');
    if(quota.error)return {data:null,error:{message:'quota unavailable'}};
    return {data:++quota.used<=10,error:null};
  },from(table:string){
    const filters:Record<string,unknown>={};let payload:Record<string,unknown>|undefined;
    const query={
      select(){return query;},eq(key:string,value:unknown){filters[key]=value;return query;},
      insert(value:Record<string,unknown>|Record<string,unknown>[]){
        if(Array.isArray(value)) { // batch insert, resolved when the query is awaited
          return {select:()=>({then(resolve:(result:unknown)=>void){
            writes++;
            if(value.some(row=>rows[table].some(existing=>existing.id===row.id)))return resolve({data:null,error:{code:'23505'}});
            rows[table].push(...value.map(row=>({...row})));
            resolve({data:value.map(row=>({id:row.id})),error:null});
          }})};
        }
        payload=value;return query;
      },
      async maybeSingle(){return {data:rows[table].find(row=>Object.entries(filters).every(([key,value])=>row[key]===value))??null,error:null};},
      async single(){
        writes++;
        if(fail)return {data:null,error:{code:'NETWORK',message:'raw private error'}};
        if(rows[table].some(row=>row.id===payload?.id))return {data:null,error:{code:'23505'}};
        rows[table].push({...payload});
        if(loseFirstResponse&&writes===1)return {data:null,error:{code:'NETWORK'}};
        return {data:{id:payload?.id},error:null};
      },
    };return query;
  }} as unknown as SupabaseClient;
  return {client,rows,quota,get writes(){return writes;}};
}

test('assistant create retries reuse one owner-scoped record and reject conflicting content',async()=>{
  const db=database();
  assert.equal(await saveAssistantRecord(db.client,'owner-a',requestId,command),requestId);
  assert.equal(await saveAssistantRecord(db.client,'owner-a',requestId,command),requestId);
  assert.equal(db.writes,1);
  assert.equal(db.rows.tasks[0].user_id,'owner-a');
  const different=parseAssistantReply({...reply,title:'A different task'},subjects);
  if(different.type!=='create')throw new Error('Bad fixture');
  await assert.rejects(()=>saveAssistantRecord(db.client,'owner-a',requestId,different.command));
  db.rows.class_sessions.push({id:requestId,user_id:'owner-a'});
  await assert.rejects(()=>saveAssistantRecord(db.client,'owner-a',requestId,command));
});

test('assistant authenticates first and never reports success on provider/DB/input failure',async()=>{
  let calls=0;
  const requester=async()=>{calls++;return reply;};
  const input={requestId,messages:[{role:'user',text:'Thêm deadline Toán ngày mai 23h'}]};
  await assert.rejects(()=>processAssistantRequest(input,async()=>{throw new Error('not authenticated');},requester));
  assert.equal(calls,0);
  const db=database(true);
  const authenticate=async()=>({client:db.client,userId:'owner-failure',subjects});
  const failed=await processAssistantRequest(input,authenticate,requester);
  assert.equal(failed.ok,false);assert.equal(failed.created,undefined);
  assert.ok(!failed.message.includes('raw private error'));
  const invalid=await processAssistantRequest({...input,requestId:'bad'},authenticate,requester);
  assert.equal(invalid.ok,false);assert.equal(calls,1);
  const provider=await processAssistantRequest(input,authenticate,async()=>{throw new Error('secret-provider-error');});
  assert.equal(provider.ok,false);assert.ok(!provider.message.includes('secret-provider-error'));
  const foreign=await processAssistantRequest(input,authenticate,async()=>({...reply,subject_id:'22222222-2222-4222-8222-222222222222'}));
  assert.equal(foreign.ok,false);
});

test('concurrent duplicate requests call Gemini and create only once; changed payload is rejected',async()=>{
  const db=database();let calls=0;
  const input={requestId,messages:[{role:'user',text:'Thêm deadline Toán ngày mai 23h'}]};
  const authenticate=async()=>({client:db.client,userId:'owner-concurrent',subjects});
  const requester=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return reply;};
  const results=await Promise.all([processAssistantRequest(input,authenticate,requester),processAssistantRequest(input,authenticate,requester)]);
  assert.ok(results.every(result=>result.ok&&result.created?.id===requestId));
  assert.equal(calls,1);assert.equal(db.writes,1);
  const conflict=await processAssistantRequest({...input,messages:[{role:'user',text:'A different request'}]},authenticate,requester);
  assert.equal(conflict.ok,false);assert.equal(calls,1);
});

test('shared quota blocks Gemini once exhausted, recovers with a new window and fails closed on errors',async()=>{
  const db=database();let calls=0;
  const authenticate=async()=>({client:db.client,userId:'owner-limit',subjects});
  const requester=async()=>{calls++;return {type:'reply',message:'Bạn muốn chọn môn nào?'};};
  const makeInput=(n:number)=>({requestId:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,messages:[{role:'user',text:'Chào'}]});
  for(let n=0;n<10;n++)assert.equal((await processAssistantRequest(makeInput(n),authenticate,requester)).ok,true);
  assert.equal((await processAssistantRequest(makeInput(10),authenticate,requester)).ok,false);
  assert.equal(calls,10);
  db.quota.used=0; // the database window rolled over
  assert.equal((await processAssistantRequest(makeInput(11),authenticate,requester)).ok,true);
  assert.equal(calls,11);
  db.quota.error=true;
  assert.equal((await processAssistantRequest(makeInput(12),authenticate,requester)).ok,false);
  assert.equal(calls,11);
});

test('retry recovers a committed insert after lost response without regenerating model fields',async()=>{
  const db=database(false,true);let calls=0;
  const input={requestId,messages:[{role:'user',text:'Thêm deadline Toán ngày mai 23h'}]};
  const authenticate=async()=>({client:db.client,userId:'owner-lost-response',subjects});
  const requester=async()=>({...reply,title:++calls===1?'Original title':'Model varied the title'});
  assert.equal((await processAssistantRequest(input,authenticate,requester)).ok,false);
  const recovered=await processAssistantRequest(input,authenticate,requester);
  assert.equal(recovered.ok,true);
  assert.equal(recovered.created?.id,requestId);
  assert.equal(calls,1);
  assert.equal(db.writes,1);
});

test('assistant creates a missing subject once and a weekly series without duplicates on retry',async()=>{
  const db=database();
  const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const series=parseAssistantReply({type:'class_series',subject_id:null,subject_name:' Tiếng   Anh ',weekdays:[3,5],start_time:'06:45',end_time:'08:15',first_date:'2026-11-16',until_date:'',location:''},subjects,id);
  if(series.type!=='create'||series.command.entity!=='class_series')throw new Error('Bad fixture');
  assert.equal(series.command.newSubject,'Tiếng Anh');
  assert.equal(series.command.values.subject_id,id);
  assert.equal(series.command.values.to,'2027-02-28'); // default 15 weeks from 16/11
  assert.equal(series.command.sessions.length,30);
  assert.equal(series.command.sessions[0].starts_at,'2026-11-17T23:45:00.000Z'); // Wed 18/11 06:45 VN
  const first=await saveAssistantRecord(db.client,'owner-a',id,series.command,1);
  assert.equal(first,seriesSessionId(id,0));
  assert.equal(await saveAssistantRecord(db.client,'owner-a',id,series.command,1),first);
  assert.equal(db.rows.subjects.length,1);
  assert.equal(db.rows.subjects[0].name,'Tiếng Anh');
  assert.equal(db.rows.subjects[0].user_id,'owner-a');
  assert.equal(db.rows.class_sessions.length,30);
  assert.equal(new Set(db.rows.class_sessions.map(row=>row.id)).size,30);
  assert.ok(db.rows.class_sessions.every(row=>row.user_id==='owner-a'&&row.subject_id===id));
});

test('assistant reuses existing subjects by name or code and asks again for unclear series',async()=>{
  const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const coded=[...subjects,{...subjects[0],id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',name:'Tiếng Anh',code:'ENG'}];
  for(const subject_name of ['toán','  TOÁN ','eng']) {
    const parsed=parseAssistantReply({...reply,subject_id:null,subject_name},coded,id);
    assert.ok(parsed.type==='create'&&!parsed.command.newSubject&&parsed.command.values.subject_id!==id);
  }
  const base={type:'class_series',subject_id:subjectId,subject_name:'',weekdays:[3],start_time:'06:45',end_time:'08:15',first_date:'2026-11-16',until_date:'',location:''};
  for(const bad of [{...base,end_time:''},{...base,weekdays:[]},{...base,weekdays:[8]},{...base,first_date:''},{...base,until_date:'2027-12-31'},{...base,end_time:'06:00'}])
    assert.throws(()=>parseAssistantReply(bad,subjects,id));
  assert.throws(()=>parseAssistantReply({...reply,subject_id:null,subject_name:'Môn mới'},subjects)); // no request id
  assert.throws(()=>parseAssistantReply({...reply,subject_id:null,subject_name:''},subjects,id));
});

test('assistant works with no subjects yet by creating the named one',async()=>{
  const db=database();
  const input={requestId,messages:[{role:'user',text:'Thêm deadline Tiếng Anh ngày mai 23h'}]};
  const result=await processAssistantRequest(input,async()=>({client:db.client,userId:'owner-new',subjects:[]}),
    async()=>({type:'task',subject_id:null,subject_name:'Tiếng Anh',title:'Bài tập',due_at:'2026-11-17T23:00'}));
  assert.equal(result.ok,true);
  assert.match(result.message,/đã tạo môn mới “Tiếng Anh”/);
  assert.equal(db.rows.subjects[0].id,requestId);
  assert.equal(db.rows.tasks[0].subject_id,requestId);
});
