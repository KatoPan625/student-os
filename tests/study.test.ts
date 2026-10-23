import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, toUtc, getMonthDays, getDashboard } from '../src/lib/study.ts';
import type { StudentData, Task } from '../src/lib/types.ts';

test('Vietnam calendar dates and input conversion do not depend on host timezone', () => {
  assert.equal(localDateKey('2026-10-22T17:30:00Z'),'2026-10-23');
  assert.equal(toUtc('2026-10-23T00:30'),'2026-10-22T17:30:00.000Z');
  assert.throws(()=>toUtc('2026-02-30T10:00'));
  assert.throws(()=>toUtc('2026-10-22T24:00'));
});
test('month grid starts Monday, includes leap day and changes years', () => {
  const leap=getMonthDays(2024,2);
  assert.equal(leap[0],'2024-01-29');
  assert.ok(leap.includes('2024-02-29'));
  assert.equal(leap.length % 7,0);
  assert.ok(getMonthDays(2026,12).includes('2027-01-01'));
  assert.equal(getMonthDays(2027,1)[0],'2026-12-28');
});
test('dashboard excludes Done from overdue and handles exact boundaries and empty subjects', () => {
  const now=new Date('2026-10-22T03:00:00Z');
  const task=(id:string,due_at:string,status:Task['status']):Task=>({id,user_id:'u',subject_id:'s',title:id,description:null,due_at,status,created_at:now.toISOString()});
  const data:StudentData={subjects:[{id:'s',user_id:'u',name:'Toán',code:null,color:'#123456',created_at:now.toISOString()},{id:'empty',user_id:'u',name:'Lý',code:null,color:'#123456',created_at:now.toISOString()}], tasks:[task('old','2026-10-21T03:00:00Z','todo'),task('done','2026-10-21T03:00:00Z','done'),task('now',now.toISOString(),'doing'),task('edge','2026-10-29T03:00:00Z','todo')],classSessions:[]};
  const result=getDashboard(data,now);
  assert.deepEqual(result.overdueTasks.map(t=>t.id),['old']);
  assert.deepEqual(result.upcomingTasks.map(t=>t.id),['now']);
  assert.equal(result.progress[0].done,1);
  assert.equal(result.progress[0].total,4);
  assert.equal(result.progress[1].percent,null);
});
test('a class crossing midnight appears on both calendar days it overlaps', () => {
  const data:StudentData={subjects:[],tasks:[],classSessions:[{id:'overnight',user_id:'u',subject_id:'s',starts_at:'2026-10-21T16:00:00Z',ends_at:'2026-10-21T18:00:00Z',location:null,created_at:'2026-10-21T00:00:00Z'}]};
  assert.equal(getDashboard(data,new Date('2026-10-22T03:00:00Z')).todayClasses.length,1);
});
