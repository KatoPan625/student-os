import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {readUserRecords} from '../src/lib/records.ts';

test('loads beyond the API row cap and retains the user filter and deterministic order',async()=>{
  const rows=Array.from({length:1001},(_,id)=>({id:String(id).padStart(4,'0')}));
  const offsets:number[]=[];
  const client=createClient('https://test.supabase.co','test-key',{global:{fetch:async(input)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
    assert.equal(url.searchParams.get('user_id'),'eq.owner');
    assert.equal(url.searchParams.get('order'),'id.asc');
    const start=Number(url.searchParams.get('offset')??0);
    const limit=Number(url.searchParams.get('limit')??1000);
    offsets.push(start);
    // Simulate a project with a lower row cap than the requested page size.
    const page=rows.slice(start,start+Math.min(limit,400));
    return new Response(JSON.stringify(page),{status:200,headers:{'Content-Type':'application/json','Content-Range':`${start}-${start+page.length-1}/${rows.length}`}});
  }}});
  const result=await readUserRecords<{id:string}>(client,'tasks','owner');
  assert.equal(result.length,1001);
  assert.equal(result[1000].id,'1000');
  assert.deepEqual(offsets,[0,400,800]);
});
test('database read failure is never mistaken for an empty successful list',async()=>{
  const client=createClient('https://test.supabase.co','test-key',{global:{fetch:async()=>new Response(JSON.stringify({message:'internal table details'}),{status:403,headers:{'Content-Type':'application/json'}})}});
  await assert.rejects(()=>readUserRecords(client,'subjects','owner'),/Không tải được dữ liệu/);
});
