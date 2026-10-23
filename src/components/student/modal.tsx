'use client';
import {useLayoutEffect,useRef} from 'react';

export function Modal({titleId,pending,onClose,children}:{titleId:string;pending:boolean;onClose:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useLayoutEffect(()=>{
    const dialog=ref.current;
    const previousFocus=document.activeElement;
    dialog?.showModal();
    return ()=>{
      dialog?.close();
      if(previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  },[]);
  return <dialog ref={ref} className="modal-backdrop" aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();if(!pending)onClose();}}
    onClick={event=>{if(event.target===event.currentTarget&&!pending)onClose();}}>
    {children}
  </dialog>;
}
