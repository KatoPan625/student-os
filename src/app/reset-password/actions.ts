'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import type { ActionState } from '@/lib/types';
export async function resetPassword(_previous: ActionState, form: FormData): Promise<ActionState> {
  const {supabase} = await requireUser();
  const password = form.get('password');
  if (typeof password!=='string'||password.length<8||password.length>256) return {ok:false,message:'Mật khẩu cần từ 8 đến 256 ký tự.'};
  try {
    const {error} = await supabase.auth.updateUser({password});
    if (error) return {ok:false,message:'Chưa đổi được mật khẩu. Thử yêu cầu liên kết mới.'};
  } catch { return {ok:false,message:'Không kết nối được dịch vụ. Vui lòng thử lại.'}; }
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
