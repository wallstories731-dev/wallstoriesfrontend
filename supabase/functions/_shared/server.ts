import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { HttpError, capturedPaymentMatches } from './core.ts'
export { HttpError } from './core.ts'
export function secret(name: string) { const v = Deno.env.get(name); if (!v) throw new HttpError(503,'Service is not configured.'); return v }
export function adminClient() { return createClient(secret('SUPABASE_URL'),secret('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}}) }
export function cors(req: Request) {
  const origin = req.headers.get('origin')
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(x => x.trim()).filter(Boolean)
  if (origin && !allowed.includes(origin)) throw new HttpError(403,'Origin is not permitted.')
  return { ...(origin ? {'Access-Control-Allow-Origin':origin} : {}), 'Vary':'Origin', 'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' }
}
export function json(body: unknown, status = 200, headers: Record<string,string> = {}) { return new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}) }
export async function readBody(req: Request, max = 32768) {
  if (Number(req.headers.get('content-length')) > max) throw new HttpError(413,'Request is too large.')
  const reader = req.body?.getReader(); if (!reader) throw new HttpError(400,'Request body required.')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new HttpError(413,'Request is too large.') } chunks.push(value) }
  const joined = new Uint8Array(size); let offset=0; for (const c of chunks) {joined.set(c,offset);offset+=c.length}
  return new TextDecoder('utf-8',{fatal:true}).decode(joined)
}
export async function bodyJson(req: Request) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415,'JSON required.')
  try { return JSON.parse(await readBody(req)) } catch(e) { if (e instanceof HttpError) throw e; throw new HttpError(400,'Invalid JSON.') }
}
export async function userFor(req: Request, admin = false) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) throw new HttpError(401,'Sign-in required.')
  const {data,error} = await adminClient().auth.getUser(auth.slice(7))
  if (error || !data.user || (admin && data.user.app_metadata?.role !== 'admin')) throw new HttpError(admin ? 403 : 401,'Access denied.')
  return data.user
}
export async function razorpay(path: string, options: RequestInit = {}) {
  const response = await fetch('https://api.razorpay.com/v1/'+path,{...options,signal:AbortSignal.timeout(15000),headers:{'Authorization':'Basic '+btoa(secret('RAZORPAY_KEY_ID')+':'+secret('RAZORPAY_KEY_SECRET')),'Content-Type':'application/json'}})
  if (!response.ok) throw new HttpError(502,'Payment provider is unavailable. Check your payment status before retrying.')
  return response.json()
}
export async function getOrder(orderId: string) {
  const {data,error} = await adminClient().from('ws_orders').select('id,data,status,user_id,amount_paise,currency,razorpay_order_id,payment_id').eq('razorpay_order_id',orderId).maybeSingle()
  if (error) throw new HttpError(503,'Order lookup unavailable.')
  if (!data) throw new HttpError(404,'Order not found.')
  return data
}
export async function confirmCapturedPayment(orderId: string, paymentId: string) {
  const order = await getOrder(orderId)
  const payment = await razorpay('payments/'+encodeURIComponent(paymentId))
  if (!capturedPaymentMatches(payment,orderId,order.amount_paise,order.currency) || payment.id !== paymentId) throw new HttpError(409,'Payment is not yet captured or does not match this order. Check again shortly.')
  const {data,error} = await adminClient().rpc('ws_mark_paid',{p_order_id:orderId,p_payment_id:paymentId,p_amount:payment.amount,p_currency:payment.currency})
  if (error || data !== true) throw new HttpError(503,'Payment reconciliation failed. Keep your reference and contact the shop.')
}
export function serve(handler: (req: Request, headers: Record<string,string>) => Promise<Response>) {
  Deno.serve(async req => {
    let headers: Record<string,string> = {}
    try { headers=cors(req); if (req.method==='OPTIONS') return new Response(null,{status:204,headers}); if (req.method!=='POST') throw new HttpError(405,'POST required.'); return await handler(req,headers) }
    catch(e) { return json({ok:false,error:e instanceof HttpError ? e.message : 'Service unavailable. Please contact the shop with your reference.'},e instanceof HttpError ? e.status : 500,headers) }
  })
}
