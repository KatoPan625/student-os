'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {sendAssistantMessage} from '@/app/(student)/assistant-actions';
import type {AssistantMessage,AssistantState} from '@/lib/types';
import {LoadingIndicator} from './loading-indicator';
import {IconClose} from './icons';

type Message=AssistantMessage&{created?:AssistantState['created']};
type Request={requestId:string;messages:AssistantMessage[]};

export function AssistantPanel() {
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const [draft,setDraft]=useState('');
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [lastRequest,setLastRequest]=useState<Request|null>(null);
  const busy=useRef(false);
  const launcher=useRef<HTMLButtonElement>(null);
  const input=useRef<HTMLTextAreaElement>(null);
  const log=useRef<HTMLDivElement>(null);
  const router=useRouter();
  useEffect(()=>{if(open)input.current?.focus({preventScroll:true});},[open]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight});},[messages,pending,error,open]);
  const close=()=>{setOpen(false);launcher.current?.focus();};

  async function send(request:Request,retry=false) {
    if(busy.current)return;
    busy.current=true;setPending(true);setError('');setLastRequest(request);
    if(!retry)setMessages(previous=>[...previous,{role:'user',text:request.messages.at(-1)!.text}].slice(-7) as Message[]);
    try {
      const result=await sendAssistantMessage(request);
      if(!result.ok){setError(result.message);return;}
      setMessages(previous=>[...previous,{role:'assistant',text:result.message,created:result.created}].slice(-8) as Message[]);
      if(!retry||draft.trim()===request.messages.at(-1)?.text)setDraft('');
      setLastRequest(null);
      if(result.created)router.refresh();
    } catch {setError('Kết nối bị gián đoạn. Dùng Thử lại với cùng yêu cầu để kiểm tra lần lưu trước.');}
    finally {busy.current=false;setPending(false);}
  }
  function submit() {
    const text=draft.trim();
    if(!text||busy.current)return;
    if(error&&lastRequest&&text===lastRequest.messages.at(-1)?.text){void send(lastRequest,true);return;}
    void send({requestId:crypto.randomUUID(),messages:[...messages.slice(-6).map(({role,text})=>({role,text})),{role:'user',text}]});
  }

  return <>
    <button ref={launcher} className="assistant-launcher" type="button" aria-expanded={open} aria-controls="student-assistant" onClick={()=>open?close():setOpen(true)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4Z"/><path d="M9 8h6M9 12h4"/></svg>
      Trợ lý học tập
    </button>
    {open&&<section id="student-assistant" className="assistant-panel" role="dialog" aria-labelledby="assistant-title" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
      <header className="assistant-header"><div><h2 id="assistant-title">Trợ lý học tập</h2><small>Gemini · Giờ Việt Nam</small></div><button type="button" className="assistant-close" aria-label="Đóng trợ lý" onClick={close}><IconClose/></button></header>
      <p className="assistant-privacy">Tin nhắn và tên/mã môn được gửi tới Gemini. Mỗi lượt thêm một lịch hoặc deadline.</p>
      <div ref={log} className="assistant-messages" role="log" aria-label="Hội thoại với trợ lý" aria-live="polite" aria-busy={pending}>
        {messages.length===0&&<div className="assistant-message assistant"><p>Bạn muốn thêm lịch học hay deadline? Hãy ghi rõ môn, ngày và giờ.</p><p>Ví dụ: “Thêm buổi học Toán ngày mai từ 8h đến 10h ở B203”.</p></div>}
        {messages.map((message,index)=><div key={index} className={`assistant-message ${message.role}`}><span className="sr-only">{message.role==='user'?'Bạn: ':'Trợ lý: '}</span><p>{message.text}</p>{message.created&&<div className="assistant-result"><Link href={message.created.entity==='task'?'/tasks':'/calendar'}>Xem {message.created.entity==='task'?'bài tập':'lịch học'} →</Link></div>}</div>)}
        {pending&&<LoadingIndicator compact label="Đang xử lý yêu cầu…"/>}
        {error&&<div className="assistant-error"><p role="alert">{error}</p>{lastRequest&&<button type="button" className="btn btn-secondary" disabled={pending} onClick={()=>void send(lastRequest,true)}>Thử lại</button>}</div>}
      </div>
      <form className="assistant-composer" onSubmit={event=>{event.preventDefault();submit();}}>
        <label className="sr-only" htmlFor="assistant-input">Yêu cầu của bạn</label>
        <textarea ref={input} id="assistant-input" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();submit();}}} maxLength={2000} rows={2} disabled={pending} placeholder="Thêm deadline Toán ngày mai 23h…" required/>
        <button className="btn btn-primary" type="submit" disabled={pending||!draft.trim()}>{pending?<LoadingIndicator compact label="Đang gửi…"/>:'Gửi'}</button>
      </form>
    </section>}
  </>;
}
