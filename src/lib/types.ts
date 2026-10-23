export type TaskStatus = 'todo' | 'doing' | 'done';
export type StudentView = 'dashboard' | 'subjects' | 'tasks' | 'calendar';
export type Subject = {
  id: string; user_id: string; name: string; code: string | null;
  color: string; created_at: string;
};
export type Task = {
  id: string; user_id: string; subject_id: string; title: string;
  description: string | null; due_at: string; status: TaskStatus; created_at: string;
};
export type ClassSession = {
  id: string; user_id: string; subject_id: string; starts_at: string;
  ends_at: string; location: string | null; created_at: string;
};
export type StudentData = { subjects: Subject[]; tasks: Task[]; classSessions: ClassSession[] };
export type ActionState = { ok: boolean; message: string; values?: Record<string, string> };
export type AssistantMessage = {role:'user'|'assistant';text:string};
export type AssistantState = {ok:boolean;message:string;created?:{entity:'task'|'class_session';id:string}};
