import type {StudentData} from './types.ts';

const escape=(value:string)=>value.replace(/[\;,]/g,match=>`\\${match}`).replace(/\r?\n/g,'\\n');
const stamp=(iso:string)=>new Date(iso).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
// RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space, never splitting a UTF-8 character.
function fold(line:string):string {
  const parts:string[]=[];let current='',size=0;
  for(const char of line) {
    const bytes=Buffer.byteLength(char);
    if(size+bytes>(parts.length?74:75)){parts.push(current);current='';size=0;}
    current+=char;size+=bytes;
  }
  return [...parts,current].join('\r\n ');
}

/** Builds an iCalendar file of class sessions and unfinished deadlines. */
export function buildIcs(data:StudentData,now=new Date()):string {
  const names=new Map(data.subjects.map(subject=>[subject.id,subject.code?`${subject.name} (${subject.code})`:subject.name]));
  const created=stamp(now.toISOString());
  const events=[
    ...data.classSessions.map(session=>['BEGIN:VEVENT',`UID:${session.id}@student-os`,`DTSTAMP:${created}`,
      `DTSTART:${stamp(session.starts_at)}`,`DTEND:${stamp(session.ends_at)}`,`SUMMARY:${escape(names.get(session.subject_id)??'Buổi học')}`,
      ...(session.location?[`LOCATION:${escape(session.location)}`]:[]),'END:VEVENT']),
    ...data.tasks.filter(task=>task.status!=='done').map(task=>['BEGIN:VEVENT',`UID:${task.id}@student-os`,`DTSTAMP:${created}`,
      `DTSTART:${stamp(task.due_at)}`,`DTEND:${stamp(task.due_at)}`,`SUMMARY:${escape(`Deadline: ${task.title}`)}`,
      `DESCRIPTION:${escape([names.get(task.subject_id),task.description].filter(Boolean).join('\n'))}`,'END:VEVENT']),
  ].flat();
  return [`BEGIN:VCALENDAR`,'VERSION:2.0','PRODID:-//Student OS//VI','CALSCALE:GREGORIAN','X-WR-CALNAME:Student OS','X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    ...events,'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
