import { serve, bodyJson, userFor, adminClient, razorpay, json, secret, HttpError } from '../_shared/server.ts'
import { priceOrder, text, validateCustomer, type CatalogPoster } from '../_shared/core.ts'
serve(async (req,headers) => {
  const user = await userFor(req); const body = await bodyJson(req)
  const ref = text(body.ref,'reference',40)
  if (!/^WS-\d{4}-[A-Z0-9]{4,32}$/.test(ref)) throw new HttpError(400,'Invalid order reference.')
  const customer = validateCustomer(body.customer), db = adminClient()
  const {data:catalog,error} = await db.from('ws_posters').select('data').eq('id','catalog').maybeSingle()
  if (error || !Array.isArray(catalog?.data)) throw new HttpError(503,'Catalog is not published yet.')
  const {total,priced} = priceOrder(body.items,catalog.data as CatalogPoster[])
  if (!Number.isSafeInteger(body.amount) || body.amount !== total) throw new HttpError(409,'Prices have changed. Reopen your cart.')
  // Reserve atomically BEFORE creating a provider order. References cannot be reused or overwrite another customer.
  const {data:reserved,error:reserveError} = await db.rpc('ws_reserve_order',{p_ref:ref,p_user_id:user.id,p_amount:total*100,p_data:{ref,total,items:priced,customer,testMode:secret('RAZORPAY_KEY_ID').startsWith('rzp_test_'),createdAt:new Date().toISOString()}})
  if (reserveError || reserved !== true) throw new HttpError(429,'Too many checkout attempts or reference already used. Wait a minute and try again.')
  const rz = await razorpay('orders',{method:'POST',body:JSON.stringify({amount:total*100,currency:'INR',receipt:ref})})
  if (!/^order_[A-Za-z0-9]+$/.test(rz.id) || rz.amount !== total*100 || rz.currency !== 'INR') throw new HttpError(502,'Unexpected payment provider response.')
  const {data:updated,error:saveError} = await db.from('ws_orders').update({status:'awaiting_payment',razorpay_order_id:rz.id}).eq('id',ref).eq('status','creating').select('id').single()
  if (saveError || !updated) throw new HttpError(503,'Checkout could not be saved. Contact the shop.')
  return json({orderId:rz.id,amountPaise:total*100,currency:'INR',keyId:secret('RAZORPAY_KEY_ID')},200,headers)
})
