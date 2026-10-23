import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'Student OS — Góc học tập của bạn', description: 'Môn học, bài tập và lịch học trong một không gian gọn gàng.'};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="vi"><body>{children}</body></html>;
}
