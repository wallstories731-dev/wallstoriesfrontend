import { useEffect } from 'react'
import { useLocation } from 'react-router'
export default function RouteEffects() {
  const {pathname,hash}=useLocation()
  useEffect(()=>{
    const label=pathname==='/'?'Good walls. Great vibes.':pathname.startsWith('/print/')?'Art print':pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-',' ')||'Shop'
    document.title=`Wall Stories — ${label}`
    if(hash){const timer=setTimeout(()=>document.getElementById(hash.slice(1))?.scrollIntoView({block:'start'}),0);return()=>clearTimeout(timer)}
    window.scrollTo({top:0,behavior:'instant'})
    const heading=document.querySelector<HTMLElement>('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}
  },[pathname,hash])
  return null
}
