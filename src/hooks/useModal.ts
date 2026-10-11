import { useEffect, useRef } from 'react'
const stack: HTMLElement[] = []
let originalOverflow = ''
const selectors='button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const visible=(element:HTMLElement)=>{let e:HTMLElement|null=element;while(e){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;e=e.parentElement}return true}
/** Shared focus trap and counted scroll lock, including stacked dialogs. */
export default function useModal<T extends HTMLElement = HTMLDivElement>(open:boolean,onClose:()=>void,suspended=false) {
  const ref=useRef<T>(null), close=useRef(onClose);close.current=onClose
  useEffect(()=>{
    const node=ref.current;if(!open || !node)return
    const previous=document.activeElement as HTMLElement|null
    if(!stack.length){originalOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
    stack.push(node)
    const targets=()=>Array.from(node.querySelectorAll<HTMLElement>(selectors)).filter(e=>!e.closest('[hidden],[aria-hidden="true"]') && e.tabIndex>=0 && visible(e))
    const first=targets()[0];node.tabIndex=-1;if(!suspended)(first || node).focus()
    const keyboard=(e:KeyboardEvent)=>{
      if(suspended || stack.at(-1)!==node)return
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();return}
      if(e.key!=='Tab')return
      const list=targets();if(!list.length){e.preventDefault();node.focus();return}
      const index=list.indexOf(document.activeElement as HTMLElement)
      if(e.shiftKey && index<=0){e.preventDefault();list.at(-1)!.focus()}
      else if(!e.shiftKey && (index===list.length-1 || index===-1)){e.preventDefault();list[0].focus()}
    }
    const focus=(e:FocusEvent)=>{if(!suspended && stack.at(-1)===node && !node.contains(e.target as Node))(targets()[0]||node).focus()}
    document.addEventListener('keydown',keyboard);document.addEventListener('focusin',focus)
    return ()=>{
      document.removeEventListener('keydown',keyboard);document.removeEventListener('focusin',focus)
      const i=stack.indexOf(node);if(i>=0)stack.splice(i,1)
      if(!stack.length)document.body.style.overflow=originalOverflow
      const current=stack.at(-1)
      if(previous?.isConnected && (!current || current.contains(previous)))previous.focus()
      else current?.focus()
    }
  },[open,suspended])
  return ref
}
