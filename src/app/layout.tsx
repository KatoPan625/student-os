import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
const sans = Plus_Jakarta_Sans({subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-sans'});
export const metadata: Metadata = {title: 'Student OS — Góc học tập của bạn', description: 'Môn học, bài tập và lịch học trong một không gian gọn gàng.'};
export const viewport: Viewport = {themeColor: [{media: '(prefers-color-scheme: light)', color: '#f4f6f8'}, {media: '(prefers-color-scheme: dark)', color: '#0b1117'}]};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="vi" className={sans.variable}><body>{children}</body></html>;
}
