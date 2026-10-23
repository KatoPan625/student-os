import type { StudentData } from './types.ts';

export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function toLocalInput(iso: string): string {
  const values = Object.fromEntries(parts.formatToParts(new Date(iso)).map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
export function localDateKey(iso: string): string { return toLocalInput(iso).slice(0, 10); }

export function toUtc(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Vui lòng nhập ngày và giờ hợp lệ.');
  const date = new Date(`${local}:00+07:00`);
  if (!Number.isFinite(date.getTime()) || toLocalInput(date.toISOString()) !== local) {
    throw new Error('Ngày hoặc giờ không tồn tại.');
  }
  return date.toISOString();
}
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {timeZone: TIME_ZONE, dateStyle: 'short', timeStyle: 'short'}).format(new Date(iso));
}
export function getMonthDays(year: number, month: number): string[] {
  if (!Number.isInteger(year) || year < 100 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Tháng không hợp lệ.');
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({length: Math.ceil((offset + days) / 7) * 7}, (_, index) =>
    new Date(Date.UTC(year, month - 1, 1 - offset + index)).toISOString().slice(0, 10));
}
export function getDashboard(data: StudentData, now: Date) {
  const instant = now.getTime();
  const dayStart = Date.parse(toUtc(`${localDateKey(now.toISOString())}T00:00`));
  const active = data.tasks.filter(task => task.status !== 'done');
  const byDeadline = (a: {due_at: string}, b: {due_at: string}) => Date.parse(a.due_at) - Date.parse(b.due_at);
  return {
    todayClasses: data.classSessions.filter(session => Date.parse(session.starts_at) < dayStart + 86400000 && Date.parse(session.ends_at) > dayStart)
      .sort((a,b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    overdueTasks: active.filter(task => Date.parse(task.due_at) < instant).sort(byDeadline),
    upcomingTasks: active.filter(task => Date.parse(task.due_at) >= instant && Date.parse(task.due_at) < instant + 7 * 86400000).sort(byDeadline),
    progress: data.subjects.map(subject => {
      const tasks = data.tasks.filter(task => task.subject_id === subject.id);
      const done = tasks.filter(task => task.status === 'done').length;
      return { subject, done, total: tasks.length, percent: tasks.length ? Math.round(done / tasks.length * 100) : null };
    }),
  };
}
