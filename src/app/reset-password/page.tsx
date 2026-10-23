import { requireUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';
export default async function ResetPassword() {
  await requireUser();
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">STUDENT OS</p><h1>Đặt mật khẩu mới</h1><p>Dùng ít nhất 8 ký tự để bảo vệ góc học tập của bạn.</p><AuthForm reset/></section></main>;
}
