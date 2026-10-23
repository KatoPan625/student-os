import { requireUser } from '@/lib/auth';
import {AssistantPanel} from '@/components/student/assistant-panel';
export const dynamic='force-dynamic';
export default async function StudentLayout({children}:{children:React.ReactNode}) {
  await requireUser();
  return <>{children}<AssistantPanel/></>;
}
