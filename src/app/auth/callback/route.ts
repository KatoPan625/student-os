import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth-input';
import { siteUrl } from '@/lib/auth';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    try {
      const supabase = await createClient();
      const {error} = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')), siteUrl()));
    } catch { /* An invalid or unavailable callback returns a safe public error. */ }
  }
  return NextResponse.redirect(new URL('/login?error=callback', siteUrl()));
}
