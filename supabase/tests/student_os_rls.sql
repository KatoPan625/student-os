-- Run through Supabase SQL Editor or the connected execute_sql tool.
-- All users and study records are transaction-local fixtures, rolled back at the end.
begin;
set local plpgsql.check_asserts = on;
select set_config('student_test.user_a', gen_random_uuid()::text, true),
       set_config('student_test.user_b', gen_random_uuid()::text, true),
       set_config('student_test.subject_a', gen_random_uuid()::text, true),
       set_config('student_test.subject_b', gen_random_uuid()::text, true),
       set_config('student_test.task_a', gen_random_uuid()::text, true),
       set_config('student_test.session_a', gen_random_uuid()::text, true),
       set_config('student_test.focus_a', gen_random_uuid()::text, true);
insert into auth.users (id)
values (current_setting('student_test.user_a')::uuid),
       (current_setting('student_test.user_b')::uuid);

set local role authenticated;
do $$
declare
  user_a uuid := current_setting('student_test.user_a')::uuid;
  user_b uuid := current_setting('student_test.user_b')::uuid;
  subject_a uuid := current_setting('student_test.subject_a')::uuid;
  subject_b uuid := current_setting('student_test.subject_b')::uuid;
  task_a uuid := current_setting('student_test.task_a')::uuid;
  session_a uuid := current_setting('student_test.session_a')::uuid;
  focus_a uuid := current_setting('student_test.focus_a')::uuid;
  target record;
  affected bigint;
  visible_rows bigint;
begin
  assert current_user = 'authenticated', 'Tests must evaluate the authenticated role, not admin bypass';
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  assert auth.uid() = user_a;
  insert into public.subjects(id, name, color) values(subject_a, 'RLS fixture A', '#059669');
  insert into public.tasks(id, subject_id, title, due_at) values(task_a, subject_a, 'RLS fixture', '2026-10-22T03:00:00Z');
  insert into public.class_sessions(id, subject_id, starts_at, ends_at)
    values(session_a, subject_a, '2026-10-22T03:00:00Z', '2026-10-22T04:00:00Z');
  insert into public.focus_sessions(id, subject_id, started_at, minutes) values(focus_a, subject_a, '2026-10-22T03:00:00Z', 25);
  update public.tasks set status = 'doing' where id = task_a;
  assert (select status = 'doing' from public.tasks where id = task_a), 'Owner update failed';
  assert (select priority = 'normal' from public.tasks where id = task_a), 'Task priority default missing';

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  insert into public.subjects(id, name, color) values(subject_b, 'RLS fixture B', '#ea580c');
  for target in select * from (values ('subjects', subject_a), ('tasks', task_a), ('class_sessions', session_a), ('focus_sessions', focus_a)) as fixtures(table_name, row_id)
  loop
    execute format('select count(*) from public.%I where id = $1', target.table_name) into visible_rows using target.row_id;
    assert visible_rows = 0, 'B can read A';
    execute format('update public.%I set user_id = $1 where id = $2', target.table_name) using user_b, target.row_id;
    get diagnostics affected = row_count;
    assert affected = 0, 'B can update A';
    execute format('delete from public.%I where id = $1', target.table_name) using target.row_id;
    get diagnostics affected = row_count;
    assert affected = 0, 'B can delete A';
  end loop;

  begin
    insert into public.tasks(subject_id, title, due_at) values(subject_a, 'Cross-owner', now());
    raise exception 'Cross-owner task FK was not enforced';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.class_sessions(subject_id, starts_at, ends_at) values(subject_a, now(), now() + interval '1 hour');
    raise exception 'Cross-owner session FK was not enforced';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.focus_sessions(subject_id, started_at, minutes) values(subject_a, now(), 25);
    raise exception 'Cross-owner focus FK was not enforced';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.tasks(user_id, subject_id, title, due_at) values(user_a, subject_a, 'Forged owner', now());
    raise exception 'Forged insert owner was accepted';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  for target in select * from (values ('subjects', subject_a), ('tasks', task_a), ('class_sessions', session_a), ('focus_sessions', focus_a)) as fixtures(table_name, row_id)
  loop
    execute format('select count(*) from public.%I where id = $1 and user_id = $2', target.table_name) into visible_rows using target.row_id, user_a;
    assert visible_rows = 1, 'A row was lost or owner changed after B writes';
  end loop;
  assert (select status = 'doing' from public.tasks where id = task_a), 'Denied write altered A task';
  begin
    update public.tasks set subject_id = subject_b where id = task_a;
    raise exception 'Task could move to B subject';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.tasks set user_id = user_b, subject_id = subject_b where id = task_a;
    raise exception 'Owner reassignment was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.subjects where id = subject_a;
    raise exception 'Subject deletion cascaded into study data';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.tasks set status = 'invalid' where id = task_a;
    raise exception 'Invalid task status was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.tasks set priority = 'urgent' where id = task_a;
    raise exception 'Invalid task priority was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.focus_sessions(subject_id, started_at, minutes) values(subject_a, now(), 0);
    raise exception 'Invalid focus duration was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.class_sessions set ends_at = starts_at where id = session_a;
    raise exception 'Invalid class duration was accepted';
  exception when check_violation then null;
  end;
  update public.tasks set status = 'done' where id = task_a;
  assert (select status = 'done' from public.tasks where id = task_a), 'Done status did not persist';
  delete from public.tasks where id = task_a;
  get diagnostics affected = row_count;
  assert affected = 1, 'Owner cannot delete own task';
  delete from public.class_sessions where id = session_a;
  get diagnostics affected = row_count;
  assert affected = 1, 'Owner cannot delete own session';
  delete from public.subjects where id = subject_a;
  get diagnostics affected = row_count;
  assert affected = 1, 'Owner cannot delete empty subject';
  assert not exists(select 1 from public.focus_sessions where id = focus_a), 'Focus log outlived its subject';
end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare visible_rows bigint;
begin
  begin
    select count(*) into visible_rows from public.subjects where id = current_setting('student_test.subject_b')::uuid;
    assert visible_rows = 0, 'Anonymous user can read a private subject';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.subjects(user_id, name, color) values(current_setting('student_test.user_a')::uuid, 'Anonymous write', '#123456');
    raise exception 'Anonymous user can create a private subject';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: owner CRUD, cross-user isolation, composite FKs (incl. focus logs and task priority), owner immutability, safe deletes, input constraints and anonymous access; fixtures rolled back' as result;
