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
export async function readTimetableImage():Promise<{ok:boolean;message:string;rows?:import('../../src/lib/timetable').TimetableRow[]}> {
  await new Promise(resolve=>setTimeout(resolve,800));
  return {ok:true,message:'Fixture: đọc được 2 buổi/tuần (không gọi Gemini thật).',rows:[
    {label:'Môn A',subject_id:'11111111-1111-4111-8111-111111111111',weekday:1,start:'07:30',end:'09:30',location:'B203'},
    {label:'Môn lạ trong ảnh',subject_id:'',weekday:6,start:'',end:'',location:''},
  ]};
}
export async function saveTimetable():Promise<ActionState> {
  await new Promise(resolve=>setTimeout(resolve,30));
  return {ok:false,message:'Lỗi thử nghiệm: chưa lưu dữ liệu.'};
}
