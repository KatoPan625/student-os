-- Shared Gemini quota (10 calls per user per rolling minute window) that works across server instances.
-- The table has no policies or grants: only the security-definer function below can read or write it,
-- so a user cannot reset their own counter through the Data API.
create table public.assistant_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  used integer not null check (used >= 0)
);
alter table public.assistant_quota enable row level security;
revoke all on public.assistant_quota from anon, authenticated;

create function public.take_assistant_quota()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_used integer;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.assistant_quota as q (user_id, window_start, used) values (v_owner, now(), 1)
  on conflict (user_id) do update set
    window_start = case when q.window_start <= now() - interval '1 minute' then now() else q.window_start end,
    used = case when q.window_start <= now() - interval '1 minute' then 1 else least(q.used + 1, 1000) end
  returning used into v_used;
  return v_used <= 10;
end;
$$;
revoke all on function public.take_assistant_quota() from public, anon;
grant execute on function public.take_assistant_quota() to authenticated;
