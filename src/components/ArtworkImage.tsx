import { useEffect, useState, type ImgHTMLAttributes } from 'react'
/** Keeps cards usable when external artwork fails or is still loading. */
export default function ArtworkImage({src,alt,className,...props}:ImgHTMLAttributes<HTMLImageElement>) {
  const [failed,setFailed]=useState(false)
  useEffect(()=>setFailed(false),[src])
  if(failed)return <span role="img" aria-label={alt || 'Artwork unavailable'} className={`artwork-fallback ${className||''}`}><span aria-hidden="true">✳</span><small>Artwork preview unavailable</small></span>
  return <img {...props} src={src} alt={alt||''} className={className} onError={()=>setFailed(true)}/>
}
