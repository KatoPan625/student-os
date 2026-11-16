import {getStudentData} from '@/lib/data';
import {buildIcs} from '@/lib/ics';

// shortcut: one-off download behind the login cookie; a subscribable feed needs a per-user secret token table.
export async function GET() {
  const ics=buildIcs(await getStudentData());
  return new Response(ics,{headers:{
    'Content-Type':'text/calendar; charset=utf-8',
    'Content-Disposition':'attachment; filename="student-os.ics"',
    'Cache-Control':'private, no-store',
  }});
}
