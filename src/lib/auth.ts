import { redirect } from 'next/navigation';
import { createClient, isConfigured } from './supabase/server';
export async function requireUser() {
  if (!isConfigured()) redirect('/login');
  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');
  return {supabase, user: data.user};
}
export function siteUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Site URL không hợp lệ.');
  return url.origin;
}
