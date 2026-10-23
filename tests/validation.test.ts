import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudentForm } from '../src/lib/validation.ts';

const subject = '11111111-1111-4111-8111-111111111111';
function form(values: Record<string, string>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}
test('task input validates owner-independent fields and permits past deadlines', () => {
  const values = { entity: 'task', intent: 'save', subject_id: subject, title: 'Bài tập', due_at: '2020-01-01T10:00', status: 'todo' };
  const parsed = parseStudentForm(form(values));
  assert.equal(parsed.entity, 'task');
  if (parsed.intent === 'save' && parsed.entity === 'task') assert.equal(parsed.values.due_at, '2020-01-01T03:00:00.000Z');
  const changes: Record<string,string>[] = [{ title: ' ' }, { status: 'other' }, { subject_id: 'wrong' }, { due_at: '2026-02-30T10:00' }, { id: 'wrong' }];
  for (const change of changes) {
    assert.throws(() => parseStudentForm(form({ ...values, ...change })));
  }
});
test('rejects empty subjects, invalid colors and invalid session durations', () => {
  assert.throws(() => parseStudentForm(form({entity:'subject',intent:'save',name:' ',color:'#123456'})));
  assert.throws(() => parseStudentForm(form({entity:'subject',intent:'save',name:'Toán',color:'javascript:alert(1)'})));
  const values = {entity:'class_session',intent:'save',subject_id:subject,starts_at:'2026-10-22T10:00',ends_at:'2026-10-22T10:00'};
  assert.throws(() => parseStudentForm(form(values)));
  assert.throws(() => parseStudentForm(form({...values,ends_at:'2026-10-22T09:00'})));
  assert.equal(parseStudentForm(form({...values,ends_at:'2026-10-22T11:00'})).entity,'class_session');
});
test('delete needs a valid ID and unsupported entities fail', () => {
  assert.throws(() => parseStudentForm(form({entity:'subject',intent:'delete'})));
  assert.throws(() => parseStudentForm(form({entity:'users',intent:'delete',id:subject})));
  assert.deepEqual(parseStudentForm(form({entity:'subject',intent:'delete',id:subject})), {entity:'subject',intent:'delete',id:subject});
});
