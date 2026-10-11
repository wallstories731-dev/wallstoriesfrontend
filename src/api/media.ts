import { previewImage } from "../data/shop"
import { isSafeImageUrl } from "./safety"
import type { DetailedLine } from "../hooks/useCart"
const slug = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")
/** One image file per selected line, named so the seller can read the order off the filenames. */
export async function posterFiles(lines: DetailedLine[]) {
  const files = await Promise.all(
    lines.map(async (l, i) => {
      try {
        if (!isSafeImageUrl(l.poster.image)) return null
        const res = await fetch(previewImage(l.poster.image), { mode: "cors", credentials: "omit", signal: AbortSignal.timeout(10000) })
        if (!res.ok) return null
        const blob = await res.blob()
        if (blob.size > 5*1024*1024 || !["image/jpeg","image/png","image/webp"].includes(blob.type)) return null
        const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
        const name = `${i + 1}-${l.poster.code}-${slug(l.poster.title)}-${slug(l.size)}-x${l.qty}.${extension}`
        return new File([blob], name, { type: blob.type || "image/jpeg" })
      } catch {
        return null
      }
    }),
  )
  return files.filter((f): f is File => f !== null)
}

