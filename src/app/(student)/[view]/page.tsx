import { notFound } from 'next/navigation';
import { getStudentData } from '@/lib/data';
import { StudentScreen } from '@/components/student/student-screen';
import type { StudentView } from '@/lib/types';
export default async function StudentPage({params,searchParams}:{params:Promise<{view:string}>;searchParams:Promise<{error?:string}>}) {
  const {view}=await params;
  if(!['dashboard','subjects','tasks','calendar'].includes(view)) notFound();
  const data=await getStudentData();
  const {error}=await searchParams;
  return <>{error==='signout'&&<p role="alert">Chưa đăng xuất được. Kiểm tra kết nối và thử lại.</p>}<StudentScreen view={view as StudentView} data={data}/></>;
}
