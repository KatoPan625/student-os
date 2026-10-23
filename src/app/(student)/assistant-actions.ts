'use server';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/auth';
import {readUserRecords} from '@/lib/records';
import {processAssistantRequest} from '@/lib/assistant-service';
import type {AssistantState,Subject} from '@/lib/types';

export async function sendAssistantMessage(input:unknown):Promise<AssistantState> {
  const {supabase,user}=await requireUser();
  if(!process.env.GEMINI_API_KEY)return {ok:false,message:'Cần điền GEMINI_API_KEY trong .env.local rồi khởi động lại server. Xem README để cấu hình Gemini.'};
  let result:AssistantState;
  try {
    result=await processAssistantRequest(input,async()=>({client:supabase,userId:user.id,subjects:await readUserRecords<Subject>(supabase,'subjects',user.id)}));
  } catch {return {ok:false,message:'Chưa đọc được môn học. Vui lòng tải lại hoặc đăng nhập lại.'};}
  if(result.created)for(const view of ['dashboard','subjects','tasks','calendar'])revalidatePath(`/${view}`);
  return result;
}
