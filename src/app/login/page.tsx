import { AuthForm } from '@/components/auth-form';
import Link from 'next/link';
import { isConfigured } from '@/lib/supabase/server';
export default async function Login({searchParams}: {searchParams:Promise<{error?:string}>}) {
  const {error} = await searchParams;
  const configured = isConfigured();
  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="brand"><span aria-hidden="true">S</span>Student OS</Link>
    <p className="eyebrow">MỘT KHÔNG GIAN, MỌI VIỆC HỌC</p>
    <h1>Học có kế hoạch.<br/>Tiến bộ mỗi ngày.</h1>
    <p>Gom lịch học, bài tập và deadline về một nơi. Bắt đầu từ việc nhỏ tiếp theo.</p>
    {error && <p role="alert" className="form-message">Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu email mới.</p>}
    {!configured && <aside className="setup-note"><strong>Ứng dụng đã sẵn sàng để cấu hình.</strong><p>Tạo file .env.local theo .env.example, điền URL và publishable key của Supabase, chạy migration rồi khởi động lại. Xem README để biết các bước.</p></aside>}
    <AuthForm configured={configured}/>
    <p><small>Dữ liệu học tập riêng cho tài khoản của bạn · Giờ Việt Nam (UTC+7)</small></p>
  </section></main>;
}
