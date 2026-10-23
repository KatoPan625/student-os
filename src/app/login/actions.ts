'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, isConfigured } from '@/lib/supabase/server';
import { parseAuthForm } from '@/lib/auth-input';
import { siteUrl } from '@/lib/auth';
import type { ActionState } from '@/lib/types';

export async function authenticate(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseAuthForm(form);
  if (!parsed.ok) return parsed;
  const values = {email: parsed.email};
  if (!isConfigured()) return {ok:false, message:'Cần cấu hình Supabase trong .env.local trước khi đăng nhập.', values};
  const mode = form.get('mode');
  if (!['login','signup','forgot'].includes(String(mode))) return {ok:false,message:'Thao tác không hợp lệ.',values};
  let success = false;
  try {
    const supabase = await createClient();
    if (mode === 'forgot') {
      const {error} = await supabase.auth.resetPasswordForEmail(parsed.email, {redirectTo:`${siteUrl()}/auth/callback?next=/reset-password`});
      return error ? {ok:false,message:'Chưa gửi được email. Vui lòng thử lại sau.',values} : {ok:true,message:'Nếu email đã được đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.',values};
    }
    if (mode === 'signup') {
      const {data,error} = await supabase.auth.signUp({email:parsed.email,password:parsed.password,options:{emailRedirectTo:`${siteUrl()}/auth/callback`}});
      if (error) return {ok:false,message:'Chưa thể đăng ký. Kiểm tra email, mật khẩu hoặc thử lại sau.',values};
      if (!data.session) return {ok:true,message:'Kiểm tra email để xác nhận tài khoản trước khi đăng nhập.',values};
      success = true;
    } else {
      const {error} = await supabase.auth.signInWithPassword({email:parsed.email,password:parsed.password});
      if (error) return {ok:false,message:'Không đăng nhập được. Kiểm tra email, mật khẩu và xác nhận email.',values};
      success = true;
    }
  } catch { return {ok:false,message:'Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại.',values}; }
  if (success) { revalidatePath('/', 'layout'); redirect('/dashboard'); }
  return {ok:false,message:'Vui lòng thử lại.',values};
}
export async function signOut() {
  const supabase = await createClient();
  const {error} = await supabase.auth.signOut();
  if (error) redirect('/dashboard?error=signout');
  revalidatePath('/', 'layout');
  redirect('/login');
}
