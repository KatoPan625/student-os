-- Keeps public.save_assistant_with_subject (created outside this repo on 2026-10-24) compatible with tasks.priority:
-- its retry check compares the whole stored task row, so the new column must be ignored there.
-- Also moves the auto-created subject color to the current palette. No-op where the function does not exist.
do $$
declare
  fn regprocedure := to_regprocedure('public.save_assistant_with_subject(uuid,text,text,jsonb)');
  source text;
  patched text;
begin
  if fn is null then return; end if;
  source := pg_get_functiondef(fn);
  if position($q$'created_at','priority']$q$ in source) > 0 then return; end if; -- already patched
  patched := replace(source, $q$array['id','user_id','subject_id','created_at']$q$, $q$array['id','user_id','subject_id','created_at','priority']$q$);
  assert patched <> source, 'save_assistant_with_subject: retry comparison not found, function changed upstream';
  patched := replace(patched, $q$'#805f46'$q$, $q$'#0f766e'$q$);
  execute patched; -- CREATE OR REPLACE keeps owner and grants
end $$;
