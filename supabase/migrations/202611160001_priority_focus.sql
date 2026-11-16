-- Additive only: safe to run once on a database that already has 202610220001_student_os.sql.
alter table public.tasks
  add column priority text not null default 'normal' check (priority in ('low', 'normal', 'high'));

-- Completed Pomodoro focus blocks. Logs are derived history, so they go away with their subject.
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null,
  started_at timestamptz not null check (isfinite(started_at)),
  minutes integer not null check (minutes between 1 and 180),
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete cascade
);
create index focus_user_started_idx on public.focus_sessions(user_id, started_at);
create index focus_subject_owner_idx on public.focus_sessions(subject_id, user_id);

alter table public.focus_sessions enable row level security;
create policy "Read own focus sessions" on public.focus_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own focus sessions" on public.focus_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own focus sessions" on public.focus_sessions for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.focus_sessions to authenticated;
