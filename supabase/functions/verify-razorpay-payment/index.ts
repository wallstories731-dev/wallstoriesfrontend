import { serve, bodyJson, userFor, getOrder, secret, confirmCapturedPayment, json, HttpError } from '../_shared/server.ts'
import { hmacHex, safeEqual } from '../_shared/core.ts'
serve(async (req,headers) => {
  const user = await userFor(req), {orderId,paymentId,signature} = await bodyJson(req)
  if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]{1,60}$/.test(orderId) || typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]{1,60}$/.test(paymentId) || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) throw new HttpError(400,'Invalid payment proof.')
  const order = await getOrder(orderId)
  if (order.user_id !== user.id) throw new HttpError(403,'Access denied.')
  // Signature is made with the stored order id; client-supplied IDs cannot change the binding.
  const expected = await hmacHex(secret('RAZORPAY_KEY_SECRET'),`${order.razorpay_order_id}|${paymentId}`)
  if (!safeEqual(expected,signature)) throw new HttpError(400,'Payment signature is invalid.')
  await confirmCapturedPayment(order.razorpay_order_id,paymentId)
  return json({ok:true},200,headers)
})
