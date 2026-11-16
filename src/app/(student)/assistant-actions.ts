'use server';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/auth';
import {readUserRecords} from '@/lib/records';
import {QUOTA_MESSAGE,processAssistantRequest,takeQuota} from '@/lib/assistant-service';
import {buildSchedule,requestTimetable} from '@/lib/assistant';
import {expandTimetable,parseTimetableReply} from '@/lib/timetable';
import type {TimetableRow} from '@/lib/timetable';
import type {ActionState,AssistantState,ClassSession,Subject,Task} from '@/lib/types';

export async function sendAssistantMessage(input:unknown):Promise<AssistantState> {
  const {supabase,user}=await requireUser();
  if(!process.env.GEMINI_API_KEY)return {ok:false,message:'Cần điền GEMINI_API_KEY trong .env.local rồi khởi động lại server. Xem README để cấu hình Gemini.'};
  let result:AssistantState;
  try {
    result=await processAssistantRequest(input,async()=>{
      const [subjects,tasks,classSessions]=await Promise.all([readUserRecords<Subject>(supabase,'subjects',user.id),
        readUserRecords<Task>(supabase,'tasks',user.id),readUserRecords<ClassSession>(supabase,'class_sessions',user.id)]);
      return {client:supabase,userId:user.id,subjects,schedule:buildSchedule({subjects,tasks,classSessions},new Date())};
    });
  } catch {return {ok:false,message:'Chưa đọc được dữ liệu học tập. Vui lòng tải lại hoặc đăng nhập lại.'};}
  if(result.created)for(const view of ['dashboard','subjects','tasks','calendar'])revalidatePath(`/${view}`);
  return result;
}

const imageTypes=['image/jpeg','image/png','image/webp'];
export async function readTimetableImage(input:unknown):Promise<{ok:boolean;message:string;rows?:TimetableRow[]}> {
  const {supabase,user}=await requireUser();
  if(!process.env.GEMINI_API_KEY)return {ok:false,message:'Cần điền GEMINI_API_KEY trong .env.local rồi khởi động lại server.'};
  const image=input&&typeof input==='object'?input as {mimeType?:unknown;data?:unknown}:{};
  if(typeof image.mimeType!=='string'||!imageTypes.includes(image.mimeType)||typeof image.data!=='string'||!image.data||image.data.length>1_000_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))
    return {ok:false,message:'Ảnh không hợp lệ hoặc quá lớn. Hãy chọn ảnh JPG/PNG/WebP.'};
  if(!await takeQuota(supabase))return {ok:false,message:QUOTA_MESSAGE};
  let subjects:Subject[];
  try {subjects=await readUserRecords<Subject>(supabase,'subjects',user.id);}
  catch {return {ok:false,message:'Chưa đọc được môn học. Vui lòng tải lại hoặc đăng nhập lại.'};}
  try {
    const rows=parseTimetableReply(await requestTimetable({mimeType:image.mimeType,data:image.data},subjects),subjects);
    if(rows.length===0)return {ok:false,message:'Không tìm thấy buổi học nào trong ảnh. Hãy thử ảnh rõ hơn hoặc cắt sát bảng.'};
    return {ok:true,message:`Đọc được ${rows.length} buổi/tuần. Kiểm tra lại trước khi lưu.`,rows};
  } catch(error) {return {ok:false,message:error instanceof Error?error.message:'Gemini chưa đọc được ảnh.'};}
}

export async function saveTimetable(input:unknown):Promise<ActionState> {
  const {supabase,user}=await requireUser();
  let rows:Record<string,unknown>[];
  try {
    const subjects=await readUserRecords<Subject>(supabase,'subjects',user.id);
    rows=expandTimetable(input,new Set(subjects.map(subject=>subject.id))).map(session=>({...session,user_id:user.id}));
  } catch(error) {return {ok:false,message:error instanceof Error?error.message:'Dữ liệu nhập không hợp lệ.'};}
  try {
    // One insert statement, so PostgREST saves all sessions or none.
    const {error}=await supabase.from('class_sessions').insert(rows);
    if(error)return {ok:false,message:'Chưa lưu được lịch học. Chưa có buổi nào được tạo; vui lòng thử lại.'};
  } catch {return {ok:false,message:'Mất kết nối. Chưa xác nhận được việc lưu; hãy tải lại trang để kiểm tra trước khi thử lại.'};}
  for(const view of ['dashboard','subjects','tasks','calendar'])revalidatePath(`/${view}`);
  return {ok:true,message:`Đã tạo ${rows.length} buổi học.`};
}
