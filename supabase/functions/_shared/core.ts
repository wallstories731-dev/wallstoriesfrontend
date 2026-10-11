// Pure validation / pricing / signature helpers; no provider SDK or credentials.
export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
export const SIZE_MULTIPLIER: Record<string, number> = { A4:1, A3:1.6, A2:2.4, '12×18':1.45, '18×24':2.15 }
export function text(value: unknown, name: string, max: number, optional = false) {
  if (optional && (value === undefined || value === '')) return ''
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value)) throw new HttpError(400, `Invalid ${name}.`)
  return value.trim()
}
export function validateCustomer(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Customer details required.')
  const c = value as Record<string,unknown>
  const name = text(c.name,'name',100), phone = text(c.phone,'phone',10), address = text(c.address,'address',500), city = text(c.city,'city',100), pincode = text(c.pincode,'pincode',6), email = text(c.email,'email',254,true)
  if (!/^[6-9]\d{9}$/.test(phone) || !/^[1-9]\d{5}$/.test(pincode) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new HttpError(400,'Invalid contact details.')
  return {name,phone,address,city,pincode,email}
}
export type CatalogPoster = { id: string; code: string; title: string; basePrice: number; sizes: string[]; status?: string; customPrices?: Record<string,{price:number}> }
export function priceOrder(items: unknown, catalog: CatalogPoster[]) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) throw new HttpError(400,'Select between 1 and 30 items.')
  let total = 0, quantity = 0; const keys = new Set<string>()
  const priced = items.map(it => {
    if (!it || typeof it !== 'object' || typeof it.posterId !== 'string' || typeof it.size !== 'string' || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20 || !Object.hasOwn(SIZE_MULTIPLIER,it.size)) throw new HttpError(400,'Invalid cart item.')
    const poster = catalog.find(p => p.id === it.posterId && p.status !== 'draft')
    const k = it.posterId + ':' + it.size
    if (!poster || !Array.isArray(poster.sizes) || !poster.sizes.includes(it.size) || keys.has(k)) throw new HttpError(409,'An item is unavailable or duplicated.')
    keys.add(k); quantity += it.qty
    if (!Number.isFinite(poster.basePrice) || poster.basePrice <= 0) throw new HttpError(503,'Catalog price is invalid.')
    const custom = poster.customPrices?.[it.size]?.price
    const unit = custom ?? Math.round((poster.basePrice * SIZE_MULTIPLIER[it.size]) / 10) * 10 - 1
    if (!Number.isSafeInteger(unit) || unit < 1 || unit > 100000) throw new HttpError(503,'Catalog price is invalid.')
    total += unit * it.qty
    return {posterId:poster.id,code:poster.code,title:poster.title,size:it.size,qty:it.qty,unit}
  })
  if (quantity > 100 || total > 500000 || !Number.isSafeInteger(total)) throw new HttpError(400,'Order exceeds checkout limits.')
  return { total, priced }
}
export async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)))].map(b => b.toString(16).padStart(2,'0')).join('')
}
export function safeEqual(a: string, b: string) {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false
  let diff = 0; for (let i = 0; i < 64; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
export function capturedPaymentMatches(p: Record<string,unknown>, orderId: string, amount: number, currency: string) {
  return /^pay_[A-Za-z0-9]+$/.test(String(p.id)) && p.order_id === orderId && p.status === 'captured' && p.captured === true && p.amount === amount && p.currency === currency && (p.amount_refunded === undefined || p.amount_refunded === 0)
}
