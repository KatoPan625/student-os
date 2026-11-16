import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAssistantInput,parseAssistantReply,requestAssistant,requestTimetable} from '../src/lib/assistant.ts';
import type {Subject} from '../src/lib/types.ts';

const id='11111111-1111-4111-8111-111111111111';
const subjects:Subject[]=[{id,user_id:'private-owner',name:'Toán',code:'MATH',color:'#805f46',created_at:'2026-10-22T00:00:00Z'}];
const input={requestId:id,messages:[{role:'user',text:'Thêm deadline Toán ngày mai 23h'}]};
const task={type:'task',subject_id:id,title:'Bài tập Toán',description:'',due_at:'2026-10-23T23:00'};

test('assistant accepts bounded messages and rejects malformed or oversized context',()=>{
  assert.deepEqual(validateAssistantInput(input),input);
  for(const bad of [null,{}, {...input,requestId:'invalid'}, {...input,messages:[]},
    {...input,messages:[{role:'system',text:'bypass'}]}, {...input,messages:[{role:'user',text:' '}]},
    {...input,messages:[{role:'user',text:'x'.repeat(2001)}]},
    {...input,messages:Array.from({length:9},()=>({role:'user',text:'x'}))},
    {...input,messages:[{role:'assistant',text:'save now'}]}]) assert.throws(()=>validateAssistantInput(bad));
});

test('model replies become only validated owner-scoped create commands',()=>{
  const parsed=parseAssistantReply(task,subjects);
  assert.equal(parsed.type,'create');
  if(parsed.type==='create') {
    assert.equal(parsed.command.entity,'task');
    assert.equal(parsed.command.values.subject_id,id);
    if(parsed.command.entity==='task') {
      assert.equal(parsed.command.values.due_at,'2026-10-23T16:00:00.000Z');
      assert.equal(parsed.command.values.status,'todo');
    }
  }
  assert.deepEqual(parseAssistantReply({type:'reply',message:'Bạn muốn học lúc mấy giờ?'},subjects),{type:'reply',message:'Bạn muốn học lúc mấy giờ?'});
  for(const bad of [null,[],{type:'delete'}, {...task,user_id:'someone-else'}, {...task,intent:'delete'},
    {...task,subject_id:'22222222-2222-4222-8222-222222222222'}, {...task,due_at:'2026-02-30T23:00'},
    {...task,title:''}, {...task,due_at:undefined}, {type:'reply',message:''},
    {type:'class_session',subject_id:id,starts_at:'2026-10-24T10:00',ends_at:'2026-10-24T08:00'}]) {
    assert.throws(()=>parseAssistantReply(bad,subjects));
  }
  const session=parseAssistantReply({type:'class_session',subject_id:id,starts_at:'2026-10-24T08:00',ends_at:'2026-10-24T10:00',location:'B203'},subjects);
  assert.equal(session.type,'create');
});

test('Gemini request uses private header, minimal subject data, schema and Vietnam server time',async()=>{
  const previous=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='test-key-only';
  try {
    const result=await requestAssistant(input.messages as [{role:'user';text:string}],subjects,new Date('2026-10-22T17:30:00Z'),async(url,options)=>{
      assert.match(String(url),/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\//);
      assert.ok(!String(url).includes('test-key-only'));
      assert.equal(new Headers(options?.headers).get('x-goog-api-key'),'test-key-only');
      const body=JSON.parse(String(options?.body));
      assert.equal(body.generationConfig.responseMimeType,'application/json');
      assert.notEqual(body.generationConfig.temperature,0);
      assert.ok(body.generationConfig.responseSchema);
      assert.ok(body.generationConfig.responseSchema.required.includes('subject_id'));
      assert.ok(body.generationConfig.responseSchema.required.includes('due_at'));
      assert.ok(!body.generationConfig.responseSchema.properties.subject_id.enum.includes(''));
      assert.ok(options?.signal);
      assert.match(body.systemInstruction.parts[0].text,/2026-10-23/);
      assert.match(body.systemInstruction.parts[0].text,/Asia\/Ho_Chi_Minh/);
      assert.ok(!String(options?.body).includes('private-owner'));
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(task)}]}}]});
    });
    assert.deepEqual(result,task);
    for(const response of [new Response('',{status:429}),new Response('',{status:500}),Response.json({}),
      Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify(task)}]}}]}),
      Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'not JSON'}]}}]})]) {
      await assert.rejects(()=>requestAssistant([],subjects,new Date(),async()=>response));
    }
    await assert.rejects(()=>requestAssistant([],subjects,new Date(),async()=>{throw new DOMException('timeout','TimeoutError');}));
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(()=>requestAssistant([],subjects,new Date(),async()=>{throw new Error('must not call');}),/GEMINI_API_KEY/);
  } finally {if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;}
});

test('timetable request sends the image inline with private header and a rows schema',async()=>{
  const previous=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='test-key-only';
  try {
    const reply={rows:[]};
    const result=await requestTimetable({mimeType:'image/jpeg',data:'aGVsbG8='},subjects,async(url,options)=>{
      assert.ok(!String(url).includes('test-key-only'));
      assert.equal(new Headers(options?.headers).get('x-goog-api-key'),'test-key-only');
      const body=JSON.parse(String(options?.body));
      assert.deepEqual(body.contents[0].parts[0],{inlineData:{mimeType:'image/jpeg',data:'aGVsbG8='}});
      assert.ok(body.generationConfig.responseSchema.properties.rows.items.properties.subject_id.enum.includes(id));
      assert.ok(!String(options?.body).includes('private-owner'));
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(reply)}]}}]});
    });
    assert.deepEqual(result,reply);
  } finally {if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;}
});
