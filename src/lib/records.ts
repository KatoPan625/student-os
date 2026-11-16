import type {SupabaseClient} from '@supabase/supabase-js';

export async function readUserRecords<T>(client:SupabaseClient,table:'subjects'|'tasks'|'class_sessions'|'focus_sessions',userId:string):Promise<T[]> {
  const rows:T[]=[];
  let total=Infinity;
  while(rows.length<total) {
    const {data,error,count}=await client.from(table).select('*',{count:'exact'})
      .eq('user_id',userId).order('id').range(rows.length,rows.length+999);
    if(error || !data || count===null || (data.length===0 && rows.length<count)) {
      throw new Error('Không tải được dữ liệu. Kiểm tra kết nối và cấu hình database rồi thử lại.');
    }
    rows.push(...data as T[]);
    total=count;
  }
  return rows;
}
