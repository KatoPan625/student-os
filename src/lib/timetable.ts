import {MAX_REPEAT_WEEKS,firstWeekdayOnOrAfter,toUtc,weeklySessions} from './study.ts';
import type {Subject} from './types.ts';

/** One weekly slot read from a timetable image; weekday 1 = Thứ Hai … 7 = Chủ Nhật. */
export type TimetableRow={label:string;subject_id:string;weekday:number;start:string;end:string;location:string};
export type TimetableSession={subject_id:string;starts_at:string;ends_at:string;location:string|null};
export const MAX_TIMETABLE_ROWS=40;
export const MAX_IMPORT_SESSIONS=600;
const time=/^([01]\d|2[0-3]):[0-5]\d$/;
const text=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';

/** Turns Gemini output into editable preview rows; anything unrecognised is blanked for the user to fill. */
export function parseTimetableReply(reply:unknown,subjects:Subject[]):TimetableRow[] {
  const rows=reply&&typeof reply==='object'&&!Array.isArray(reply)?(reply as {rows?:unknown}).rows:undefined;
  if(!Array.isArray(rows))throw new Error('Gemini chưa đọc được thời khóa biểu. Hãy thử ảnh rõ hơn.');
  const ids=new Set(subjects.map(subject=>subject.id));
  return rows.slice(0,MAX_TIMETABLE_ROWS).flatMap((raw):TimetableRow[]=>{
    if(!raw||typeof raw!=='object')return [];
    const row=raw as Record<string,unknown>;
    const weekday=Number(row.weekday);
    if(!Number.isInteger(weekday)||weekday<1||weekday>7)return [];
    const subject_id=text(row.subject_id,36);
    const start=text(row.start,5),end=text(row.end,5);
    return [{label:text(row.subject_name,120),subject_id:ids.has(subject_id)?subject_id:'',weekday,
      start:time.test(start)?start:'',end:time.test(end)?end:'',location:text(row.location,300)}];
  });
}

/** Validates the confirmed preview and expands each weekly slot over the semester range. */
export function expandTimetable(input:unknown,subjectIds:Set<string>):TimetableSession[] {
  const value=input&&typeof input==='object'?input as Record<string,unknown>:{};
  const {from,to,rows}=value;
  if(typeof from!=='string'||typeof to!=='string'||!Array.isArray(rows))throw new Error('Dữ liệu nhập không hợp lệ.');
  const first=Date.parse(toUtc(`${from}T00:00`)),last=Date.parse(toUtc(`${to}T00:00`));
  if(last<first)throw new Error('Ngày kết thúc học kỳ phải sau ngày bắt đầu.');
  if(last-first>=MAX_REPEAT_WEEKS*7*86400000)throw new Error(`Học kỳ tối đa ${MAX_REPEAT_WEEKS} tuần.`);
  if(rows.length<1||rows.length>MAX_TIMETABLE_ROWS)throw new Error(`Chọn từ 1 đến ${MAX_TIMETABLE_ROWS} dòng lịch.`);
  const sessions=rows.flatMap((raw,index):TimetableSession[]=>{
    const row=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
    const where=`Dòng ${index+1}`;
    if(typeof row.subject_id!=='string'||!subjectIds.has(row.subject_id))throw new Error(`${where}: hãy chọn môn học.`);
    if(!Number.isInteger(row.weekday)||(row.weekday as number)<1||(row.weekday as number)>7)throw new Error(`${where}: thứ không hợp lệ.`);
    if(typeof row.start!=='string'||typeof row.end!=='string'||!time.test(row.start)||!time.test(row.end))throw new Error(`${where}: hãy nhập giờ bắt đầu và kết thúc.`);
    if(row.end<=row.start)throw new Error(`${where}: giờ kết thúc phải sau giờ bắt đầu.`);
    if(row.location!==undefined&&(typeof row.location!=='string'||row.location.length>300))throw new Error(`${where}: địa điểm tối đa 300 ký tự.`);
    const day=firstWeekdayOnOrAfter(from,row.weekday as number);
    if(day>to)return [];
    const location=typeof row.location==='string'&&row.location.trim()?row.location.trim():null;
    return weeklySessions(toUtc(`${day}T${row.start}`),toUtc(`${day}T${row.end}`),to)
      .map(session=>({subject_id:row.subject_id as string,...session,location}));
  });
  if(sessions.length===0)throw new Error('Không có buổi học nào trong khoảng ngày đã chọn.');
  if(sessions.length>MAX_IMPORT_SESSIONS)throw new Error(`Tối đa ${MAX_IMPORT_SESSIONS} buổi học mỗi lần nhập.`);
  return sessions;
}
