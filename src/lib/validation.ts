import { toUtc } from './study.ts';
import type { TaskStatus } from './types.ts';

type Entity = 'subject' | 'task' | 'class_session';
type Command =
  | {entity: Entity; intent: 'delete'; id: string}
  | {entity: 'subject'; intent: 'save'; id?: string; values: {name: string; code: string | null; color: string}}
  | {entity: 'task'; intent: 'save'; id?: string; values: {subject_id: string; title: string; description: string | null; due_at: string; status: TaskStatus}}
  | {entity: 'class_session'; intent: 'save'; id?: string; values: {subject_id: string; starts_at: string; ends_at: string; location: string | null}};

export function parseStudentForm(form: FormData): Command {
  const text = (name: string, max: number, required = false) => {
    const raw = form.get(name);
    if (raw !== null && typeof raw !== 'string') throw new Error('Dữ liệu biểu mẫu không hợp lệ.');
    const value = (raw ?? '').trim();
    if ((required && !value) || value.length > max) throw new Error(`Vui lòng kiểm tra ${name} (tối đa ${max} ký tự).`);
    return value;
  };
  const uuid = (value: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Mã bản ghi không hợp lệ.');
    return value;
  };
  const entity = text('entity', 20);
  const intent = text('intent', 10);
  if (entity !== 'subject' && entity !== 'task' && entity !== 'class_session') throw new Error('Loại dữ liệu không hợp lệ.');
  if (intent !== 'save' && intent !== 'delete') throw new Error('Thao tác không hợp lệ.');
  const rawId = text('id', 36);
  const id = rawId ? uuid(rawId) : undefined;
  if (intent === 'delete') {
    if (!id) throw new Error('Thiếu mã bản ghi cần xóa.');
    return {entity, intent, id};
  }
  if (entity === 'subject') {
    const color = text('color', 7, true);
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Màu môn học không hợp lệ.');
    return {entity, intent, id, values: {name: text('name', 120, true), code: text('code', 30) || null, color}};
  }
  const subject_id = uuid(text('subject_id', 36, true));
  if (entity === 'task') {
    const status = text('status', 10, true);
    if (status !== 'todo' && status !== 'doing' && status !== 'done') throw new Error('Trạng thái không hợp lệ.');
    return {entity, intent, id, values: {subject_id, title: text('title', 240, true), description: text('description', 10000) || null, due_at: toUtc(text('due_at', 16, true)), status}};
  }
  const starts_at = toUtc(text('starts_at', 16, true));
  const ends_at = toUtc(text('ends_at', 16, true));
  if (ends_at <= starts_at) throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
  return {entity, intent, id, values: {subject_id, starts_at, ends_at, location: text('location', 300) || null}};
}
