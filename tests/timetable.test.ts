import {test} from 'node:test';
import assert from 'node:assert/strict';
import {firstWeekdayOnOrAfter,weeklySessions} from '../src/lib/study.ts';
import {expandTimetable,parseTimetableReply} from '../src/lib/timetable.ts';
import {buildIcs} from '../src/lib/ics.ts';
import {parseStudentForm} from '../src/lib/validation.ts';
import type {StudentData,Subject} from '../src/lib/types.ts';

const id='11111111-1111-4111-8111-111111111111';
const subjects:Subject[]=[{id,user_id:'u',name:'Toán',code:'MATH',color:'#805f46',created_at:'2026-10-22T00:00:00Z'}];

test('weekly sessions repeat in Vietnam time through the inclusive end date, capped at 26 weeks',()=>{
  const sessions=weeklySessions('2026-11-16T01:00:00.000Z','2026-11-16T03:00:00.000Z','2026-11-30');
  assert.deepEqual(sessions.map(s=>s.starts_at),['2026-11-16T01:00:00.000Z','2026-11-23T01:00:00.000Z','2026-11-30T01:00:00.000Z']);
  assert.equal(sessions[2].ends_at,'2026-11-30T03:00:00.000Z');
  // 23:00 VN on the last day is still that VN day even though it is the next UTC day.
  assert.equal(weeklySessions('2026-11-16T16:00:00.000Z','2026-11-16T16:30:00.000Z','2026-11-23').length,2);
  assert.equal(weeklySessions('2026-11-16T01:00:00.000Z','2026-11-16T03:00:00.000Z','2027-05-16').length,26);
  assert.throws(()=>weeklySessions('2026-11-16T01:00:00.000Z','2026-11-16T03:00:00.000Z','2027-05-17'),/26 tuần/);
  assert.throws(()=>weeklySessions('2026-11-16T01:00:00.000Z','2026-11-16T03:00:00.000Z','2026-11-15'));
  assert.throws(()=>weeklySessions('2026-11-16T01:00:00.000Z','2026-11-16T03:00:00.000Z','2026-02-30'));
});

test('form accepts repeat_until only when creating a session',()=>{
  const form=new FormData();
  for(const [k,v] of Object.entries({entity:'class_session',intent:'save',subject_id:id,starts_at:'2026-11-16T08:00',ends_at:'2026-11-16T10:00',repeat_until:'2026-12-31'}))form.set(k,v);
  const command=parseStudentForm(form);
  assert.ok(command.entity==='class_session'&&command.intent==='save'&&command.repeatUntil==='2026-12-31');
  form.set('id',id);
  assert.throws(()=>parseStudentForm(form),/tạo buổi học mới/);
});

test('timetable reply keeps only valid weekdays and blanks unknown subjects and times',()=>{
  const rows=parseTimetableReply({rows:[
    {subject_name:'Toán cao cấp',subject_id:id,weekday:2,start:'07:30',end:'09:30',location:'B203'},
    {subject_name:'Lạ',subject_id:'22222222-2222-4222-8222-222222222222',weekday:7,start:'tiết 1',end:'',location:''},
    {subject_name:'Sai thứ',subject_id:id,weekday:8,start:'07:00',end:'08:00',location:''},
  ]},subjects);
  assert.deepEqual(rows,[
    {label:'Toán cao cấp',subject_id:id,weekday:2,start:'07:30',end:'09:30',location:'B203'},
    {label:'Lạ',subject_id:'',weekday:7,start:'',end:'',location:''},
  ]);
  assert.throws(()=>parseTimetableReply({},subjects));
});

test('timetable expands from the first matching weekday and validates every row',()=>{
  assert.equal(firstWeekdayOnOrAfter('2026-11-16',1),'2026-11-16'); // Monday
  assert.equal(firstWeekdayOnOrAfter('2026-11-16',7),'2026-11-22');
  assert.equal(firstWeekdayOnOrAfter('2026-11-17',1),'2026-11-23');
  const ids=new Set([id]);
  const sessions=expandTimetable({from:'2026-11-17',to:'2026-11-30',rows:[{subject_id:id,weekday:1,start:'07:30',end:'09:30',location:' B203 '}]},ids);
  assert.deepEqual(sessions,[{subject_id:id,starts_at:'2026-11-23T00:30:00.000Z',ends_at:'2026-11-23T02:30:00.000Z',location:'B203'},
    {subject_id:id,starts_at:'2026-11-30T00:30:00.000Z',ends_at:'2026-11-30T02:30:00.000Z',location:'B203'}]);
  const good={subject_id:id,weekday:1,start:'07:30',end:'09:30',location:''};
  for(const bad of [
    {from:'2026-11-30',to:'2026-11-16',rows:[good]},
    {from:'2026-11-16',to:'2027-06-30',rows:[good]},
    {from:'2026-11-16',to:'2026-11-30',rows:[]},
    {from:'2026-11-16',to:'2026-11-30',rows:[{...good,subject_id:'22222222-2222-4222-8222-222222222222'}]},
    {from:'2026-11-16',to:'2026-11-30',rows:[{...good,weekday:0}]},
    {from:'2026-11-16',to:'2026-11-30',rows:[{...good,end:'07:00'}]},
    {from:'2026-11-16',to:'2026-11-30',rows:[{...good,start:''}]},
    {from:'2026-11-17',to:'2026-11-18',rows:[good]},
    null,
  ])assert.throws(()=>expandTimetable(bad,ids));
});

test('ICS export escapes text, skips done tasks and folds long lines without breaking UTF-8',()=>{
  const data:StudentData={subjects,focusSessions:[],classSessions:[{id:'s1',user_id:'u',subject_id:id,starts_at:'2026-11-16T01:00:00Z',ends_at:'2026-11-16T03:00:00Z',location:'Phòng A, tầng 2; cơ sở 1',created_at:''}],
    tasks:[{id:'t1',user_id:'u',subject_id:id,title:'Bài '+'dài '.repeat(30),description:'Dòng 1\nDòng 2',due_at:'2026-11-20T16:00:00Z',status:'todo',priority:'normal',created_at:''},
      {id:'t2',user_id:'u',subject_id:id,title:'Đã xong',description:null,due_at:'2026-11-20T16:00:00Z',status:'done',priority:'normal',created_at:''}]};
  const ics=buildIcs(data,new Date('2026-11-16T00:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n')&&ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics,/DTSTART:20261116T010000Z/);
  assert.ok(ics.includes('LOCATION:Phòng A\\, tầng 2\\; cơ sở 1'));
  assert.match(ics,/DESCRIPTION:Toán \(MATH\)\\nDòng 1\\nDòng 2/);
  assert.ok(!ics.includes('Đã xong'));
  for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75,line);
  assert.ok(ics.replace(/\r\n /g,'').includes('SUMMARY:Deadline: Bài '+'dài '.repeat(30).trim()));
});
