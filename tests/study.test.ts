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
  const task=(id:string,due_at:string,status:Task['status']):Task=>({id,user_id:'u',subject_id:'s',title:id,description:null,due_at,status,priority:'normal',created_at:now.toISOString()});
  const data:StudentData={subjects:[{id:'s',user_id:'u',name:'Toán',code:null,color:'#123456',created_at:now.toISOString()},{id:'empty',user_id:'u',name:'Lý',code:null,color:'#123456',created_at:now.toISOString()}], tasks:[task('old','2026-10-21T03:00:00Z','todo'),task('done','2026-10-21T03:00:00Z','done'),task('now',now.toISOString(),'doing'),task('edge','2026-10-29T03:00:00Z','todo')],classSessions:[],focusSessions:[]};
  const result=getDashboard(data,now);
  assert.deepEqual(result.overdueTasks.map(t=>t.id),['old']);
  assert.deepEqual(result.upcomingTasks.map(t=>t.id),['now']);
  assert.equal(result.progress[0].done,1);
  assert.equal(result.progress[0].total,4);
  assert.equal(result.progress[1].percent,null);
});
test('a class crossing midnight appears on both calendar days it overlaps', () => {
  const data:StudentData={subjects:[],tasks:[],classSessions:[{id:'overnight',user_id:'u',subject_id:'s',starts_at:'2026-10-21T16:00:00Z',ends_at:'2026-10-21T18:00:00Z',location:null,created_at:'2026-10-21T00:00:00Z'}],focusSessions:[]};
  assert.equal(getDashboard(data,new Date('2026-10-22T03:00:00Z')).todayClasses.length,1);
});

test('next tasks put overdue first, then deadline shifted by priority; focus minutes count from Monday VN', () => {
  const now=new Date('2026-11-18T03:00:00Z'); // Wednesday 10:00 VN
  const task=(id:string,due_at:string,priority:Task['priority'],status:Task['status']='todo'):Task=>({id,user_id:'u',subject_id:'s',title:id,description:null,due_at,status,priority,created_at:''});
  const focus=(id:string,started_at:string,minutes:number)=>({id,user_id:'u',subject_id:'s',started_at,minutes,created_at:''});
  const data:StudentData={subjects:[{id:'s',user_id:'u',name:'Toán',code:null,color:'#123456',created_at:''}],classSessions:[],
    tasks:[task('soon-low','2026-11-19T03:00:00Z','low'),task('later-high','2026-11-20T03:00:00Z','high'),task('late','2026-11-17T03:00:00Z','low'),
      task('done','2026-11-16T03:00:00Z','high','done'),task('normal','2026-11-19T15:00:00Z','normal')],
    // Monday 16/11 00:00 VN = 2026-11-15T17:00Z; the Sunday-night block belongs to last week.
    focusSessions:[focus('a','2026-11-15T16:59:00Z',50),focus('b','2026-11-15T17:00:00Z',25),focus('c','2026-11-18T01:00:00Z',25)]};
  const result=getDashboard(data,now);
  assert.deepEqual(result.nextTasks.map(t=>t.id),['late','later-high','normal']);
  assert.equal(result.weekFocusMinutes.get('s'),50);
});
