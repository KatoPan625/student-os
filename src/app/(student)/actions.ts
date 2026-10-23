'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { parseStudentForm } from '@/lib/validation';
import type { ActionState } from '@/lib/types';

export async function mutateStudentData(_previous:ActionState,form:FormData):Promise<ActionState> {
  const {supabase,user}=await requireUser();
  const fields=['entity','intent','id','name','code','color','subject_id','title','description','due_at','status','starts_at','ends_at','location'];
  const values=Object.fromEntries(fields.map(key=>[key,typeof form.get(key)==='string'?String(form.get(key)).slice(0,10000):'']));
  let command:ReturnType<typeof parseStudentForm>;
  try { command=parseStudentForm(form); }
  catch(error) { return {ok:false,message:error instanceof Error?error.message:'Biểu mẫu không hợp lệ.',values}; }
  const table={subject:'subjects',task:'tasks',class_session:'class_sessions'}[command.entity];
  try {
    const result=command.intent==='delete'
      ? await supabase.from(table).delete().eq('id',command.id).eq('user_id',user.id).select('id').maybeSingle()
      : command.id
        ? await supabase.from(table).update(command.values).eq('id',command.id).eq('user_id',user.id).select('id').maybeSingle()
        : await supabase.from(table).insert({...command.values,user_id:user.id}).select('id').single();
    if(result.error) return {ok:false,message:result.error.code==='23503'?'Môn học không hợp lệ hoặc vẫn còn bài tập/buổi học. Hãy kiểm tra trước khi lưu hoặc xóa.':'Chưa lưu được thay đổi. Vui lòng thử lại.',values};
    if(!result.data) return {ok:false,message:'Bản ghi không tồn tại hoặc bạn không có quyền thay đổi.',values};
  } catch { return {ok:false,message:'Mất kết nối. Nội dung của bạn vẫn được giữ để thử lại.',values}; }
  for(const view of ['dashboard','subjects','tasks','calendar']) revalidatePath(`/${view}`);
  return {ok:true,message:command.intent==='delete'?'Đã xóa bản ghi.':'Đã lưu thay đổi.'};
}
