import { requireUser } from './auth';
import { readUserRecords } from './records';
import type { StudentData, Subject, Task, ClassSession, FocusSession } from './types';
export async function getStudentData(): Promise<StudentData> {
  const {supabase, user} = await requireUser();
  const [subjects,tasks,classSessions,focusSessions] = await Promise.all([
    readUserRecords<Subject>(supabase,'subjects',user.id),
    readUserRecords<Task>(supabase,'tasks',user.id),
    readUserRecords<ClassSession>(supabase,'class_sessions',user.id),
    readUserRecords<FocusSession>(supabase,'focus_sessions',user.id),
  ]);
  return {subjects,tasks,classSessions,focusSessions};
}
