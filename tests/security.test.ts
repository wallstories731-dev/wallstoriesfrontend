import { test } from 'node:test'
import assert from 'node:assert/strict'
import { priceOrder, validateCustomer, safeEqual, hmacHex, capturedPaymentMatches } from '../supabase/functions/_shared/core.ts'
import { csvCell, escapeHtml, normalizeCart, isSafeImageUrl } from '../src/api/safety.ts'
const catalog=[{id:'print',code:'WS-01',title:'A print',basePrice:499,sizes:['A4','A3'],status:'active',customPrices:{A3:{price:875}}}]
const customer={name:'Buyer',phone:'9876543210',address:'12 Test Road',city:'Chennai',pincode:'600001',email:'buyer@example.com'}
test('server prices ignore injected browser unit prices and honor published custom prices',()=>{
  assert.equal(priceOrder([{posterId:'print',size:'A3',qty:2,price:1}],catalog).total,1750)
  assert.equal(priceOrder([{posterId:'print',size:'A4',qty:1}],catalog).total,499)
})
test('rejects duplicate lines, prototype keys, negative/fractional/string quantities, unknown IDs and oversized carts',()=>{
  const line={posterId:'print',size:'A4',qty:1}
  for(const items of [[line,line],[{...line,size:'__proto__'}],[{...line,qty:-1}],[{...line,qty:1.5}],[{...line,qty:'1'}],[{...line,qty:21}],[{...line,posterId:'other'}],Array(31).fill(line),[]])assert.throws(()=>priceOrder(items,catalog))
})
test('draft products, broken prices, and excessive totals fail closed',()=>{
  assert.throws(()=>priceOrder([{posterId:'print',size:'A4',qty:1}],[{...catalog[0],status:'draft'}]))
  assert.throws(()=>priceOrder([{posterId:'print',size:'A4',qty:1}],[{...catalog[0],basePrice:NaN}]))
  assert.throws(()=>priceOrder([{posterId:'print',size:'A3',qty:20}],[{...catalog[0],customPrices:{A3:{price:100000}}}]))
})
test('bounded customer fields reject objects, control characters, invalid contacts',()=>{
  assert.deepEqual(validateCustomer(customer),customer)
  for(const bad of [{name:'x'.repeat(101)},{name:{}},{address:'\u0000'},{phone:'1234567890'},{pincode:'000001'},{email:'<script>'}])assert.throws(()=>validateCustomer({...customer,...bad}))
})
test('a valid HMAC cannot be replaced with empty, short or malformed signatures',async()=>{
  const signature=await hmacHex('server-secret','order_A|pay_B')
  assert.equal(signature.length,64);assert.equal(safeEqual(signature,signature),true)
  for(const bad of ['',signature.slice(1),'z'.repeat(64),signature.toUpperCase(),'0'.repeat(64)])assert.equal(safeEqual(signature,bad),false)
  assert.equal(safeEqual(signature,await hmacHex('server-secret','order_A|pay_C')),false)
})
test('authorized, refunded, wrong amount, wrong order, and wrong currency payments are not paid',()=>{
  const p={id:'pay_123',order_id:'order_123',status:'captured',captured:true,amount:49900,currency:'INR',amount_refunded:0}
  assert.equal(capturedPaymentMatches(p,'order_123',49900,'INR'),true)
  for(const patch of [{status:'authorized'},{captured:false},{amount:1},{currency:'USD'},{order_id:'order_OTHER'},{amount_refunded:49900}])assert.equal(capturedPaymentMatches({...p,...patch},'order_123',49900,'INR'),false)
})
test('packing slip text is escaped and spreadsheet formulas are neutralized',()=>{
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  for(const cell of ['=HYPERLINK("evil")','+cmd','-cmd','@SUM(A1)','\t=1',' \n=1'])assert.ok(csvCell(cell).startsWith('"\''))
  assert.equal(csvCell('a,"b"'), '"a,""b"""')
})
test('stored carts cannot inject invalid lines, overrun limits or duplicate quantities',()=>{
  const valid={posterId:'print',size:'A4',qty:15}
  assert.deepEqual(normalizeCart({}),[])
  const rows=normalizeCart([valid,valid,{...valid,qty:-1},{...valid,size:'constructor'}]);assert.equal(rows.length,1);assert.equal(rows[0].qty,20)
})
test('active and insecure image URL schemes are rejected',()=>{
  for(const url of ['javascript:alert(1)','data:image/svg+xml,evil','http://example.com/a','//evil.example/a'])assert.equal(isSafeImageUrl(url),false)
  assert.equal(isSafeImageUrl('https://images.example/a.jpg'),true);assert.equal(isSafeImageUrl('/art/a.jpg'),true)
})
