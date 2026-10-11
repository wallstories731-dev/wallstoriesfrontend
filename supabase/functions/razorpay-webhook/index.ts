import { readBody, secret, confirmCapturedPayment, HttpError } from '../_shared/server.ts'
import { hmacHex, safeEqual } from '../_shared/core.ts'
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('POST required',{status:405})
  try {
    const raw = await readBody(req,131072), sig = req.headers.get('x-razorpay-signature') || ''
    if (!safeEqual(await hmacHex(secret('RAZORPAY_WEBHOOK_SECRET'),raw),sig)) return new Response('Invalid signature',{status:400})
    let event; try {event=JSON.parse(raw)} catch {throw new HttpError(400,'Invalid event.')}
    if (['payment.captured','order.paid'].includes(event.event)) {
      const payment = event.payload?.payment?.entity
      if (!payment || !/^order_[A-Za-z0-9]{1,60}$/.test(payment.order_id) || !/^pay_[A-Za-z0-9]{1,60}$/.test(payment.id)) throw new HttpError(400,'Payment entity required.')
      // Re-fetch capture and amount; signed callbacks still cannot overwrite an unrelated order.
      await confirmCapturedPayment(payment.order_id,payment.id)
    }
    return new Response('ok',{status:200})
  } catch(e) {
    // Never acknowledge failed persistence; provider retries instead of losing payments.
    return new Response('Webhook not processed',{status:e instanceof HttpError && [400,413].includes(e.status) ? e.status : 503})
  }
})
