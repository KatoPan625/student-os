'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { parseStudentForm } from '@/lib/validation';
import { weeklySessions } from '@/lib/study';
import type { ActionState } from '@/lib/types';

export async function mutateStudentData(_previous:ActionState,form:FormData):Promise<ActionState> {
  const {supabase,user}=await requireUser();
  const fields=['entity','intent','id','name','code','color','subject_id','title','description','due_at','status','starts_at','ends_at','location','repeat_until','priority'];
  const values=Object.fromEntries(fields.map(key=>[key,typeof form.get(key)==='string'?String(form.get(key)).slice(0,10000):'']));
  let command:ReturnType<typeof parseStudentForm>;
  let repeated:Record<string,unknown>[]|undefined;
  try {
    command=parseStudentForm(form);
    if(command.entity==='class_session'&&command.intent==='save'&&command.repeatUntil) {
      const {values:session}=command;
      repeated=weeklySessions(session.starts_at,session.ends_at,command.repeatUntil).map(time=>({...session,...time,user_id:user.id}));
    }
  }
  catch(error) { return {ok:false,message:error instanceof Error?error.message:'Biểu mẫu không hợp lệ.',values}; }
  const table={subject:'subjects',task:'tasks',class_session:'class_sessions'}[command.entity];
  try {
    const result=command.intent==='delete'
      ? await supabase.from(table).delete().eq('id',command.id).eq('user_id',user.id).select('id').maybeSingle()
      : repeated
        ? await supabase.from(table).insert(repeated).select('id')
      : command.id
        ? await supabase.from(table).update(command.values).eq('id',command.id).eq('user_id',user.id).select('id').maybeSingle()
        : await supabase.from(table).insert({...command.values,user_id:user.id}).select('id').single();
    if(result.error) return {ok:false,message:result.error.code==='23503'?'Môn học không hợp lệ hoặc vẫn còn bài tập/buổi học. Hãy kiểm tra trước khi lưu hoặc xóa.':'Chưa lưu được thay đổi. Vui lòng thử lại.',values};
    if(!result.data) return {ok:false,message:'Bản ghi không tồn tại hoặc bạn không có quyền thay đổi.',values};
  } catch { return {ok:false,message:'Mất kết nối. Nội dung của bạn vẫn được giữ để thử lại.',values}; }
  for(const view of ['dashboard','subjects','tasks','calendar']) revalidatePath(`/${view}`);
  return {ok:true,message:command.intent==='delete'?'Đã xóa bản ghi.':repeated?`Đã tạo ${repeated.length} buổi học hằng tuần.`:'Đã lưu thay đổi.'};
}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Records one finished Pomodoro block; the start must be within the last 24 hours. */
export async function logFocusSession(input:unknown):Promise<ActionState> {
  const {supabase,user}=await requireUser();
  const value=input&&typeof input==='object'?input as Record<string,unknown>:{};
  const started=typeof value.started_at==='string'?Date.parse(value.started_at):NaN;
  if(typeof value.subject_id!=='string'||!uuid.test(value.subject_id)||!Number.isInteger(value.minutes)||(value.minutes as number)<1||(value.minutes as number)>180
    ||!Number.isFinite(started)||started>Date.now()+60000||started<Date.now()-86400000)return {ok:false,message:'Phiên tập trung không hợp lệ.'};
  try {
    const {error}=await supabase.from('focus_sessions').insert({subject_id:value.subject_id,started_at:new Date(started).toISOString(),minutes:value.minutes,user_id:user.id});
    if(error)return {ok:false,message:'Chưa lưu được phiên tập trung.'};
  } catch {return {ok:false,message:'Mất kết nối. Chưa lưu được phiên tập trung.'};}
  revalidatePath('/dashboard');
  return {ok:true,message:`Đã ghi ${value.minutes} phút tập trung.`};
}
