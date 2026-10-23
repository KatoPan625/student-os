import type {ActionState} from '../../src/lib/types';
import type {AssistantMessage,AssistantState} from '../../src/lib/types';
export async function mutateStudentData(_previous:ActionState,form:FormData):Promise<ActionState> {
  await new Promise(resolve=>setTimeout(resolve,30));
  return {ok:false,message:'Lỗi thử nghiệm: chưa lưu dữ liệu.',values:Object.fromEntries([...form].map(([key,value])=>[key,String(value)]))};
}
export async function signOut() { /* UI fixture never authenticates or changes real data. */ }
const assistantAttempts=new Map<string,number>();
export async function sendAssistantMessage(input:{requestId:string;messages:AssistantMessage[]}):Promise<AssistantState> {
  await new Promise(resolve=>setTimeout(resolve,1500));
  const attempt=(assistantAttempts.get(input.requestId)??0)+1;
  assistantAttempts.set(input.requestId,attempt);
  const text=input.messages.at(-1)?.text??'';
  if(text.includes('lỗi phục hồi')&&attempt>1)return {ok:true,message:'Fixture: đã xác nhận lần lưu cũ.',created:{entity:'task',id:input.requestId}};
  if(text.includes('lỗi'))return {ok:false,message:'Lỗi thử nghiệm: chưa xác nhận lưu. Không có dữ liệu thật được ghi.'};
  if(text.includes('24/10/2026'))return {ok:true,message:'Fixture: đã thêm deadline Toán lúc 23h ngày 24/10/2026. Không ghi database thật.',created:{entity:'task',id:input.requestId}};
  return {ok:true,message:'Bạn muốn đặt deadline vào ngày nào, lúc mấy giờ? (Fixture, không gọi Gemini thật)'};
}
