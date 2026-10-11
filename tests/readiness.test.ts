import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizePosters, normalizeShop, normalizeCategories, normalizeFeatured } from "../src/api/models.ts"
import { isPublicSupabaseKey, validatePublicBuildEnv } from "../src/api/publicConfig.ts"
import { effectivePrintDpi, validateRasterFile } from "../src/api/images.ts"

test("catalog normalization rejects malformed rows and preserves published prices and artwork", () => {
  const poster={id:"print",code:"WS-01",title:"Print",category:"Art",basePrice:499,sizes:["A4","A3"],image:"https://example.com/art.png",customPrices:{A3:{price:875,mrp:999}},description:"300 GSM",status:"active"}
  const result=normalizePosters([null,{},poster,poster,{...poster,id:"bad",customPrices:{A3:{price:"1"}}},{...poster,id:"insecure",image:"javascript:alert(1)"}])
  assert.equal(result.length,1);assert.equal(result[0].image,poster.image);assert.equal(result[0].customPrices?.A3?.price,875);assert.deepEqual(result[0].sizes,["A4","A3"])
  assert.deepEqual(normalizePosters([]),[]);assert.deepEqual(normalizePosters(null),[])
})
test("shop and navigation state use safe defaults when stored fields have invalid types", () => {
  const fallback={name:"Wall Stories",tagline:"Art",instagramUsername:"thewallstories_2026",currency:"₹"}
  assert.deepEqual(normalizeShop({name:{},instagramUsername:"bad/?text=evil",currency:"USD"},fallback),fallback)
  assert.equal(normalizeShop({instagramUsername:"@new.shop"},fallback).instagramUsername,"new.shop")
  assert.deepEqual(normalizeCategories([null,"All","Art","Art",{}],["All"]),["All","Art"])
  assert.deepEqual(normalizeFeatured({posterId:{}},{posterId:"print"}),{posterId:"print"})
})
test("public builds reject secret keys and permit publishable or legacy anon keys", () => {
  const jwt=(role:string)=>"eyJhbGciOiJIUzI1NiJ9."+Buffer.from(JSON.stringify({role})).toString("base64url")+".test_signature"
  assert.equal(isPublicSupabaseKey("sb_publishable_Test123"),true);assert.equal(isPublicSupabaseKey(jwt("anon")),true)
  for(const value of ["sb_secret_Test123",jwt("service_role"),jwt("authenticated"),"malformed"]){assert.equal(isPublicSupabaseKey(value),false);assert.throws(()=>validatePublicBuildEnv({VITE_SUPABASE_ANON_KEY:value}))}
  assert.throws(()=>validatePublicBuildEnv({VITE_RAZORPAY_KEY_SECRET:"test-only-fixture"}));assert.doesNotThrow(()=>validatePublicBuildEnv({VITE_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_Test123",RAZORPAY_KEY_SECRET:"server-only-test-fixture"}))
})
test("custom print quality uses the weaker dimension and raster checks reject MIME spoofing", async () => {
  assert.equal(effectivePrintDpi(2480,3508,2480,3508),300)
  assert.equal(effectivePrintDpi(100,35080,2480,3508)<150,true);assert.equal(effectivePrintDpi(24800,100,2480,3508)<150,true)
  assert.equal(effectivePrintDpi(0,3508,2480,3508),0)
  await assert.rejects(validateRasterFile(new File(["<svg/>"],"spoof.png",{type:"image/png"})))
  await assert.doesNotReject(validateRasterFile(new File([new Uint8Array([137,80,78,71,13,10,26,10])],"header.png",{type:"image/png"})))
})
