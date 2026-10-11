import { serve, bodyJson, userFor, adminClient, json, HttpError } from '../_shared/server.ts'
import { text } from '../_shared/core.ts'
serve(async (req,headers) => {
  await userFor(req,true); const body = await bodyJson(req), db=adminClient()
  if (body.action==='list') {
    const {data,error}=await db.from('ws_orders').select('id,status,data,created_at,payment_id').order('created_at',{ascending:false}).limit(500)
    if (error) throw new HttpError(503,'Orders unavailable.')
    return json({orders:data},200,headers)
  }
  if (body.action!=='update') throw new HttpError(400,'Unsupported action.')
  const id=text(body.id,'order ID',50)
  const {data:row,error}=await db.from('ws_orders').select('id,status,data').eq('id',id).single()
  if (error || !row) throw new HttpError(404,'Order not found.')
  const patch=body.patch || {}, data={...row.data}
  // No client-set price, paid flag, signature, payment ID, items, or refund state.
  const allowed=['name','phone','address','city','pincode','courier','trackingId','note']
  if (Object.keys(patch).some(k => !allowed.includes(k) && k!=='status')) throw new HttpError(400,'Field cannot be edited.')
  for (const k of allowed) if (k in patch) {
    const value=text(patch[k],k,k==='note'?1000:500,true)
    if (['name','phone','address','city','pincode'].includes(k)) data.customer={...data.customer,[k]:value}
    else if(k==='note') data.notes=[...(data.notes||[]),{id:crypto.randomUUID(),text:value,createdAt:Date.now()}].slice(-100)
    else data[k]=value
  }
  let status=row.status
  if (patch.status!==undefined) {
    if (data.testMode === true && ['printed','shipped','delivered'].includes(patch.status)) throw new HttpError(409,'Test payments cannot be fulfilled as live orders.')
    const transitions:Record<string,string[]>={paid:['printed'],printed:['shipped'],shipped:['delivered'],creating:['cancelled'],awaiting_payment:['cancelled']}
    if (!transitions[status]?.includes(patch.status)) throw new HttpError(409,'Invalid order transition. Payment state can only be changed by verified payment processing.')
    status=patch.status
  }
  data.timeline=[...(data.timeline||[]),{status,at:Date.now()}].slice(-100)
  const {data:updated,error:updateError}=await db.from('ws_orders').update({status,data}).eq('id',id).eq('status',row.status).select('id').maybeSingle()
  if(updateError || !updated) throw new HttpError(409,'Order changed. Reload and retry.')
  return json({ok:true},200,headers)
})
