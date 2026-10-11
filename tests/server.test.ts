// Exercise the REAL edge handlers with isolated provider/DB stubs, never live payments.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { hmacHex } from '../supabase/functions/_shared/core.ts'
const dir=await mkdtemp(join(tmpdir(),'poster-handlers-'))
after(()=>rm(dir,{recursive:true,force:true}))
const root=new URL('../supabase/functions/',import.meta.url)
for(const file of ['_shared/core','_shared/server','create-razorpay-order/index','verify-razorpay-payment/index','razorpay-webhook/index','admin-orders/index']) {
  let source=await readFile(new URL(file+'.ts',root),'utf8')
  if(file==='_shared/server') source=source.replace(/import \{ createClient \} from [^\n]+/, 'const createClient = () => globalThis.__db')
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/\.ts(['"])/g,'.mjs$1')
  await mkdir(join(dir,file.split('/')[0]),{recursive:true});await writeFile(join(dir,file+'.mjs'),code)
}
let handler:(req:Request)=>Promise<Response>
const env:Record<string,string>={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only',RAZORPAY_KEY_ID:'rzp_test_key',RAZORPAY_KEY_SECRET:'server-secret',RAZORPAY_WEBHOOK_SECRET:'webhook-secret',ALLOWED_ORIGINS:'https://shop.example'}
let user={id:'buyer-1',app_metadata:{} as Record<string,string>},rpcError=false,reserve=true,providerCalls=0,providerStatus='captured'
const order={id:'WS-2026-ABC123',user_id:'buyer-1',razorpay_order_id:'order_A',amount_paise:49900,currency:'INR',status:'awaiting_payment',data:{total:499,testMode:false}}
let reservation:Record<string,unknown>={}
const catalog=[{id:'print',code:'WS-01',title:'Print',basePrice:499,sizes:['A4']}]
const db={auth:{getUser:async(token:string)=>token==='valid'?{data:{user},error:null}:{data:{user:null},error:new Error('bad token')}},from:(table:string)=>{
  const query:any={select:()=>query,eq:()=>query,update:()=>query,order:()=>query,limit:()=>query,maybeSingle:async()=>({data:table==='ws_posters'?{data:catalog}:order,error:null}),single:async()=>({data:table==='ws_posters'?{data:catalog}:order,error:null})};return query
},rpc:async(name:string,args?:Record<string,any>)=>{if(name==='ws_reserve_order')reservation=args?.p_data||{};return {data:name==='ws_reserve_order'?reserve:true,error:rpcError?new Error('db failure'):null}}}
Object.assign(globalThis,{__db:db,Deno:{env:{get:(k:string)=>env[k]},serve:(fn:typeof handler)=>{handler=fn}}})
const originalFetch=globalThis.fetch
globalThis.fetch=async()=>{providerCalls++;return new Response(JSON.stringify({id:'pay_B',order_id:'order_A',amount:49900,currency:'INR',status:providerStatus,captured:providerStatus==='captured',amount_refunded:0}),{status:200,headers:{'Content-Type':'application/json'}})}
after(()=>{globalThis.fetch=originalFetch;delete (globalThis as any).Deno;delete (globalThis as any).__db})
async function load(file:string){await import(pathToFileURL(join(dir,file+'/index.mjs')).href);return handler}
function request(body:unknown,token='valid',origin='https://shop.example'){return new Request('https://api.example/function',{method:'POST',headers:{'Authorization':'Bearer '+token,'Origin':origin,'Content-Type':'application/json'},body:JSON.stringify(body)})}
test('edge handlers enforce origin, authentication, ownership, capture and retry behavior',async()=>{
  const verify=await load('verify-razorpay-payment'),signature=await hmacHex('server-secret','order_A|pay_B'),proof={orderId:'order_A',paymentId:'pay_B',signature}
  assert.equal((await verify(request(proof,'valid','https://evil.example'))).status,403)
  assert.equal((await verify(request(proof,'invalid'))).status,401)
  user={id:'other-buyer',app_metadata:{}};assert.equal((await verify(request(proof))).status,403);assert.equal(providerCalls,0)
  user={id:'buyer-1',app_metadata:{}};assert.equal((await verify(request({...proof,signature:'0'.repeat(64)}))).status,400);assert.equal(providerCalls,0)
  providerStatus='authorized';assert.equal((await verify(request(proof))).status,409)
  providerStatus='captured';rpcError=true;assert.equal((await verify(request(proof))).status,503)
  rpcError=false;assert.equal((await verify(request(proof))).status,200)
  const create=await load('create-razorpay-order');const body={ref:'WS-2026-ABC123',amount:499,items:[{posterId:'print',size:'A4',qty:1}],customer:{name:'Buyer',phone:'9876543210',address:'Test Street',city:'Chennai',pincode:'600001'}}
  const before=providerCalls;assert.equal((await create(request({...body,amount:1}))).status,409)
  reserve=false;assert.equal((await create(request(body))).status,429);assert.equal(providerCalls,before)
  assert.equal(reservation.testMode,true)
  env.RAZORPAY_KEY_ID='rzp_live_key';await create(request({...body,testMode:true}));assert.equal(reservation.testMode,false);env.RAZORPAY_KEY_ID='rzp_test_key'
  const huge=new Request('https://api.example',{method:'POST',headers:{'Authorization':'Bearer valid','Content-Type':'application/json','Origin':'https://shop.example'},body:'x'.repeat(40000)})
  assert.equal((await create(huge)).status,413)
  const admin=await load('admin-orders');assert.equal((await admin(request({action:'list'}))).status,403)
  user={id:'admin',app_metadata:{role:'admin'}};assert.equal((await admin(request({action:'update',id:order.id,patch:{status:'paid'}}))).status,409)
  assert.equal((await admin(request({action:'update',id:order.id,patch:{total:1}}))).status,400)
  order.data.testMode=true;order.status='paid';assert.equal((await admin(request({action:'update',id:order.id,patch:{status:'printed'}}))).status,409);order.data.testMode=false;order.status='awaiting_payment'
  const webhook=await load('razorpay-webhook');const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_B',order_id:'order_A'}}}})
  const web=(sig:string)=>new Request('https://api.example/webhook',{method:'POST',headers:{'x-razorpay-signature':sig},body:raw})
  assert.equal((await webhook(web('0'.repeat(64)))).status,400)
  const websig=await hmacHex('webhook-secret',raw);rpcError=true;assert.equal((await webhook(web(websig))).status,503)
  rpcError=false;assert.equal((await webhook(web(websig))).status,200)
})
