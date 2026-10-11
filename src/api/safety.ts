export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
export function csvCell(value: unknown): string {
  let s = String(value ?? "")
  if (/^[\s]*[=+\-@\t\r\n]/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}
export function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false
  if (/^\/(?!\/)/.test(value)) return true
  try { return new URL(value).protocol === "https:" } catch { return false }
}
export function validateImageFile(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES || !file.size)
    throw new Error("Choose a JPEG, PNG or WebP image up to 5 MB.")
}
export function normalizeCart(input: unknown): {posterId:string;size:"A4"|"A3"|"A2"|"12×18"|"18×24";qty:number}[] {
  if (!Array.isArray(input)) return []
  const out = new Map<string, {posterId:string;size:"A4"|"A3"|"A2"|"12×18"|"18×24";qty:number}>()
  for (const v of input.slice(0,30)) {
    if (!v || typeof v.posterId !== 'string' || v.posterId.length > 100 || !['A4','A3','A2','12×18','18×24'].includes(v.size) || !Number.isInteger(v.qty) || v.qty < 1 || v.qty > 20) continue
    const key = v.posterId + ':' + v.size
    out.set(key, {posterId:v.posterId,size:v.size,qty:Math.min(20,(out.get(key)?.qty || 0)+v.qty)})
  }
  return [...out.values()]
}
