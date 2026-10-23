create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  code text check (char_length(code) <= 30),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text check (char_length(description) <= 10000),
  due_at timestamptz not null check (isfinite(due_at)),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete restrict
);
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null,
  starts_at timestamptz not null check (isfinite(starts_at)),
  ends_at timestamptz not null check (isfinite(ends_at) and ends_at > starts_at),
  location text check (char_length(location) <= 300),
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete restrict
);
create index subjects_user_id_idx on public.subjects(user_id);
create index tasks_user_due_idx on public.tasks(user_id, due_at);
create index tasks_subject_owner_idx on public.tasks(subject_id, user_id);
create index sessions_user_start_idx on public.class_sessions(user_id, starts_at);
create index sessions_subject_owner_idx on public.class_sessions(subject_id, user_id);

alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.class_sessions enable row level security;

create policy "Read own subjects" on public.subjects for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own subjects" on public.subjects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own subjects" on public.subjects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own subjects" on public.subjects for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Read own tasks" on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own tasks" on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own tasks" on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own tasks" on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Read own sessions" on public.class_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own sessions" on public.class_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own sessions" on public.class_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own sessions" on public.class_sessions for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.subjects, public.tasks, public.class_sessions to authenticated;
