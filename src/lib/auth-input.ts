import type { ActionState } from './types.ts';

export function safeNext(value: string | null): '/dashboard' | '/reset-password' {
  return value === '/reset-password' ? value : '/dashboard';
}

export function parseAuthForm(form: FormData):
  | { ok: true; email: string; password: string }
  | (ActionState & { ok: false }) {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Vui lòng nhập email hợp lệ.', values: { email } };
  }
  if (form.get('mode') !== 'forgot' && (!password || password.length > 256)) {
    return { ok: false, message: 'Vui lòng nhập mật khẩu (tối đa 256 ký tự).', values: { email } };
  }
  if (form.get('mode') === 'signup' && password.length < 8) {
    return { ok: false, message: 'Mật khẩu cần ít nhất 8 ký tự.', values: { email } };
  }
  return { ok: true, email, password };
}
