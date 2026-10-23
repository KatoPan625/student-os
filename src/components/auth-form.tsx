'use client';
import { useActionState, useState } from 'react';
import { authenticate } from '@/app/login/actions';
import { resetPassword } from '@/app/reset-password/actions';
import {LoadingIndicator} from './student/loading-indicator';

export function AuthForm({reset = false, configured = true}: {reset?: boolean; configured?: boolean}) {
  const [mode, setMode] = useState<'login'|'signup'|'forgot'>('login');
  const [state, action, pending] = useActionState(reset ? resetPassword : authenticate, {ok:false,message:''});
  return <>
    {!reset && <div className="auth-tabs" role="group" aria-label="Tài khoản">
      <button type="button" aria-pressed={mode==='login'} onClick={()=>setMode('login')}>Đăng nhập</button>
      <button type="button" aria-pressed={mode==='signup'} onClick={()=>setMode('signup')}>Tạo tài khoản</button>
    </div>}
    <form className="auth-form" action={action}>
      <input type="hidden" name="mode" value={mode}/>
      {!reset && <label className="form-field">Email<input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.values?.email} placeholder="ban@truong.edu.vn"/></label>}
      {(reset || mode!=='forgot') && <label className="form-field">{reset?'Mật khẩu mới':'Mật khẩu'}<input name="password" type="password" autoComplete={reset||mode==='signup'?'new-password':'current-password'} minLength={reset||mode==='signup'?8:1} maxLength={256} required placeholder={reset||mode==='signup'?'Ít nhất 8 ký tự':'Nhập mật khẩu của bạn'}/></label>}
      {state.message && <p className="form-message" role={state.ok?'status':'alert'} aria-live="polite">{state.message}</p>}
      <button type="submit" disabled={pending||!configured}>{pending?<LoadingIndicator compact label="Đang xử lý…"/>:reset?'Lưu mật khẩu mới':mode==='signup'?'Tạo tài khoản':mode==='forgot'?'Gửi liên kết đặt lại':'Vào góc học tập →'}</button>
      {!reset && <button type="button" onClick={()=>setMode(mode==='forgot'?'login':'forgot')}>{mode==='forgot'?'Quay lại đăng nhập':'Quên mật khẩu?'}</button>}
    </form>
  </>;
}
