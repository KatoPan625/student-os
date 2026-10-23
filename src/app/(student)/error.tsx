'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main style={{padding:'3rem'}}><h1>Chưa tải được dữ liệu</h1><p role="alert">Kiểm tra kết nối và đảm bảo migration Supabase đã được áp dụng.</p><button onClick={reset}>Thử lại</button><p><Link href="/login">Về trang đăng nhập</Link></p></main>;
}
