import { copyText } from "../hooks/useCart"
import { validateRasterFile, effectivePrintDpi, getContactSettings, makeOrderReference } from "../api"
import { useRef, useState, useEffect } from "react"
import AnnouncementBar from "../components/AnnouncementBar"
import SiteNav from "../components/SiteNav"
import Footer from "../components/Footer"
import { useStore } from "../context/StoreContext"
import { SIZE_DIMS, type SizeKey } from "../data/shop"

const SIZES: SizeKey[] = ["A4", "A3", "A2", "12×18", "18×24"]

const SIZE_PRICES: Record<SizeKey, number> = {
  A4: 599,
  A3: 799,
  A2: 1199,
  "12×18": 899,
  "18×24": 1299,
}

const MIN_DPI = 150
const PRINT_DIMS_PX: Record<SizeKey, { w: number; h: number }> = {
  A4: { w: 2480, h: 3508 },
  A3: { w: 3508, h: 4961 },
  A2: { w: 4961, h: 7016 },
  "12×18": { w: 3600, h: 5400 },
  "18×24": { w: 5400, h: 7200 },
}

function UploadIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
}
function WarnIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10.29 3.86-8.4 14.53A1 1 0 0 0 2.75 20h18.5a1 1 0 0 0 .86-1.51l-8.4-14.53a1 1 0 0 0-1.72 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}

function isGoodResolution(imgW: number, imgH: number, size: SizeKey) {
  const dim = PRINT_DIMS_PX[size]
  return effectivePrintDpi(imgW, imgH, dim.w, dim.h) >= MIN_DPI
}

function formatMoney(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export default function CustomPosterPage() {
  const { cartCount, shop } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null)
  const [size, setSize] = useState<SizeKey>("A3")
  const [finish, setFinish] = useState<"matte" | "satin">("matte")
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [sent, setSent] = useState(false)
  const [preparedMessage, setPreparedMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [channel,setChannel]=useState<"instagram"|"whatsapp">("instagram")
  const [sendError,setSendError]=useState("")
  const [sending,setSending]=useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const previewUrl=useRef<string|null>(null)
  const generation=useRef(0)
  const [uploadError,setUploadError]=useState("")
  useEffect(()=>()=>{generation.current++;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current)},[])

  const goodRes = imgDims ? isGoodResolution(imgDims.w, imgDims.h, size) : true

  const handleFile = async (file: File) => {
    const id=++generation.current
    if(previewUrl.current)URL.revokeObjectURL(previewUrl.current)
    previewUrl.current=null;setPreview(null);setImgDims(null);setUploadError("")
    try { await validateRasterFile(file) } catch(e) { if(id===generation.current)setUploadError((e as Error).message); return }
    if(id!==generation.current)return
    const url=URL.createObjectURL(file);previewUrl.current=url
    setPreview(null);setImgDims(null);setUploadError("")
    const img=new Image()
    img.onload=()=>{if(id!==generation.current || previewUrl.current!==url)return;setImgDims({w:img.naturalWidth,h:img.naturalHeight});setPreview(url)}
    img.onerror=()=>{if(id!==generation.current || previewUrl.current!==url)return;URL.revokeObjectURL(url);previewUrl.current=null;setUploadError("This image could not be opened. Choose a valid JPEG, PNG or WebP.")}
    img.src=url
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const total = SIZE_PRICES[size] * qty

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if(sending)return
    setSendError("")
    if(!name.trim()){setSendError("Enter your name.");document.getElementById("custom-name")?.focus();return}
    const digits=phone.replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"")
    if(!/^[\d\s()+-]+$/.test(phone) || !/^[6-9]\d{9}$/.test(digits)){setSendError("Enter a valid 10-digit Indian mobile number.");document.getElementById("custom-phone")?.focus();return}
    if(!preview){setSendError("Upload your artwork before preparing an order.");setStep(1);return}
    const selected=(e.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement && (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="whatsapp" ? "whatsapp" : "instagram"
    setChannel(selected)
    const sizeDim = SIZE_DIMS[size]
    const msg = [
      "Hi! I'd like to order a custom poster:",
      "Reference: "+makeOrderReference(),
      "",
      `Name: ${name.trim()}`,
      `Phone: ${digits}`,
      `Size: ${size} (${sizeDim.cm})`,
      `Finish: ${finish}`,
      "Paper: 300 GSM",
      `Quantity: ${qty}`,
      `Estimated subtotal: ${formatMoney(total)}`,
      "Shipping and final price confirmed by the shop. Payment not yet made.",
      note ? `Note: ${note}` : "",
      "",
      "I will attach my original image file in the chat.",
    ].filter(Boolean).join("\n")

    const destination=selected==="whatsapp" ? "https://wa.me/"+getContactSettings().whatsappNumber+"?text="+encodeURIComponent(msg) : "https://ig.me/m/"+shop.instagramUsername
    window.open(destination, "_blank", "noopener,noreferrer")
    setPreparedMessage(msg)
    setSending(true)
    setSent(true)
    try{setCopied(await copyText(msg))}finally{setSending(false)}
  }

  const fieldCls = "w-full rounded-[10px] border px-3.5 py-2.5 text-[14px] focus:outline-none transition"
  const fieldStyle = {
    borderColor: "var(--color-hairline)",
    background: "var(--color-ground-soft)",
    color: "var(--color-ink)",
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav cartCount={cartCount} bumped={false} onOpenCart={() => {}} />

      <main className="mx-auto max-w-[1240px] px-4 py-12 sm:px-8 sm:py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: "var(--color-magenta)", fontFamily: "var(--font-display)" }}>
            Bring your own
          </p>
          <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.03em] sm:text-[48px]" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>
            Custom Poster
          </h1>
          <p className="mx-auto mt-4 max-w-[54ch] text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Upload your own photo or artwork. We&rsquo;ll print it on 300 GSM matte art paper in any of our five sizes — same quality as our catalogue.
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-10 flex items-center justify-center gap-0">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="flex items-center">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition"
                style={{
                  background: step >= n ? "var(--color-magenta)" : "var(--color-ground-soft)",
                  color: step >= n ? "var(--color-ground)" : "var(--color-ink-soft)",
                }}
              >
                {n}
              </div>
              {n < 3 && (
                <div className="h-px w-12" style={{ background: step > n ? "var(--color-magenta)" : "var(--color-hairline)" }} />
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-[840px]">
          {sent ? (
            /* Success state */
            <div className="text-center py-16">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--color-success-soft)" }}>
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
              </div>
              <textarea readOnly value={preparedMessage} rows={6} aria-label="Prepared custom request" className="my-5 w-full rounded-lg border border-hairline p-3 text-sm"/>
              <h2 className="text-[24px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Request ready to send</h2>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {channel === "whatsapp" ? "Your request is ready in WhatsApp. Attach your artwork and press send to share it with the shop." : copied ? "Your request is copied. Paste it in Instagram and attach your artwork before sending." : "Copy your request above and paste it in Instagram. Attach your artwork before sending."}
              </p>
              <button disabled={sending}
                onClick={() => { generation.current++;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=null;if(fileRef.current)fileRef.current.value="";setSent(false);setStep(1);setPreview(null);setImgDims(null);setSendError("");setUploadError("");setCopied(false);setNote("");setQty(1) }}
                className="mt-8 rounded-full border px-6 py-2.5 text-[14px] font-medium transition hover:border-magenta hover:text-magenta"
                style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
              >
                Start another order
              </button>
            </div>
          ) : step === 1 ? (
            /* Step 1: Upload */
            <div className="space-y-6">
              <h2 className="text-[20px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>1. Upload your image</h2>

              {uploadError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{uploadError}</p>}
              {/* Drop zone */}
              <div
                className="relative flex flex-col items-center justify-center gap-4 rounded-[16px] border-2 border-dashed p-10 text-center transition"
                style={{ borderColor: preview ? "var(--color-magenta)" : "var(--color-hairline)", background: "var(--color-ground-soft)" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                role="button" tabIndex={0} aria-label="Choose your artwork"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click() } }}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file" aria-label="Upload artwork"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
                {preview ? (
                  <img src={preview} alt="Your upload" className="max-h-[320px] max-w-full rounded-[10px] object-contain shadow-md" />
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--color-ground)" }}>
                      <span style={{ color: "var(--color-magenta)" }}><UploadIcon className="h-7 w-7" /></span>
                    </div>
                    <div>
                      <p className="text-[15px] font-medium" style={{ color: "var(--color-ink)" }}>Drop your image here</p>
                      <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>or click to browse · JPG, PNG or WebP · up to 5 MB</p>
                    </div>
                  </>
                )}
              </div>

              {preview && (
                <div className="flex items-center justify-between">
                  <button
                    role="button" tabIndex={0} aria-label="Choose your artwork"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click() } }}
                onClick={() => fileRef.current?.click()}
                    className="text-[13px] underline underline-offset-4 transition hover:text-magenta"
                    style={{ color: "var(--color-ink-soft)" }}
                  >
                    Choose different image
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-full px-6 py-2.5 text-[14px] font-medium transition hover:opacity-90"
                    style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}
                  >
                    Next: choose size →
                  </button>
                </div>
              )}

              <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground)" }}>
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Image tips</p>
                <ul className="mt-2 space-y-1.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                  <li>· For A4/A3: minimum 2000 × 2800px recommended</li>
                  <li>· For A2/18×24: minimum 4000 × 5400px recommended</li>
                  <li>· Use JPEG, PNG or WebP up to 5 MB for the preview.</li>
                  <li>· Scanned artwork prints beautifully — 600dpi minimum</li>
                </ul>
              </div>
            </div>
          ) : step === 2 ? (
            /* Step 2: Options */
            <div className="grid gap-8 md:grid-cols-[1fr_340px]">
              {/* Live preview */}
              <div className="flex flex-col gap-4">
                <h2 className="text-[20px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>2. Choose size &amp; finish</h2>

                {/* Preview card */}
                <div
                  className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[14px] p-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                  style={{ background: "var(--poster-mat)" }}
                >
                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="poster-frame max-h-full max-w-full rounded-[6px] object-contain shadow-[0_12px_36px_-16px_rgba(0,0,0,0.5)]"
                    />
                  )}
                  {/* Size label */}
                  <span
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold"
                    style={{ background: "var(--color-ink)", color: "var(--color-ground)" }}
                  >
                    {size} · {SIZE_DIMS[size].cm}
                  </span>

                  {/* Low-res warning */}
                  {imgDims && !goodRes && (
                    <div
                      className="absolute top-4 left-4 right-4 flex items-start gap-2 rounded-[10px] border p-3"
                      style={{ background: "var(--color-danger-soft)", borderColor: "var(--color-danger)" }}
                    >
                      <span style={{ color: "var(--color-danger)" }} className="mt-0.5 shrink-0"><WarnIcon className="h-4 w-4" /></span>
                      <div>
                        <p className="text-[12px] font-semibold" style={{ color: "var(--color-danger)" }}>Low resolution warning</p>
                        <p className="text-[11px]" style={{ color: "var(--color-danger)" }}>
                          Your image ({imgDims.w}×{imgDims.h}px) may appear soft at {size}. Try a smaller size for crisp results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-5">
                {/* Size */}
                <div>
                  <p className="mb-2 text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-soft)" }}>Print size</p>
                  <div className="space-y-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={size===s} onClick={() => setSize(s)}
                        className="flex w-full items-center justify-between rounded-[10px] border px-4 py-3 text-left transition"
                        style={{
                          borderColor: size === s ? "var(--color-magenta)" : "var(--color-hairline)",
                          background: size === s ? "color-mix(in srgb, var(--color-magenta) 6%, var(--color-ground))" : "var(--color-ground)",
                        }}
                      >
                        <span>
                          <span className="block text-[14px] font-medium" style={{ color: "var(--color-ink)" }}>{s}</span>
                          <span className="text-[12px]" style={{ color: "var(--color-ink-soft)" }}>{SIZE_DIMS[s].cm} · {SIZE_DIMS[s].inches}</span>
                        </span>
                        <span className="text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>{formatMoney(SIZE_PRICES[s])}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Finish */}
                <div>
                  <p className="mb-2 text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-soft)" }}>Finish</p>
                  <div className="flex gap-2">
                    {(["matte", "satin"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={finish===f} onClick={() => setFinish(f)}
                        className="flex-1 rounded-[10px] border py-2.5 text-[13px] font-medium capitalize transition"
                        style={{
                          borderColor: finish === f ? "var(--color-magenta)" : "var(--color-hairline)",
                          background: finish === f ? "color-mix(in srgb, var(--color-magenta) 6%, var(--color-ground))" : "var(--color-ground)",
                          color: finish === f ? "var(--color-ink)" : "var(--color-ink-soft)",
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
                    {finish === "matte" ? "Deep blacks, no glare — our most popular." : "Slight sheen, richer saturation for colour photos."}
                  </p>
                </div>

                {/* Qty */}
                <div>
                  <p className="mb-2 text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-soft)" }}>Quantity</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Decrease custom quantity" disabled={qty<=1}
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-ink"
                      style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
                    >−</button>
                    <span className="w-8 text-center text-[16px] font-semibold" style={{ color: "var(--color-ink)" }}>{qty}</span>
                    <button
                      type="button"
                      aria-label="Increase custom quantity" disabled={qty>=10}
                      onClick={() => setQty((q) => Math.min(10, q + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-ink"
                      style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
                    >+</button>
                  </div>
                </div>

                {/* Total + CTA */}
                <div
                  className="rounded-[12px] border p-4"
                  style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>Total</span>
                    <span className="text-[22px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{formatMoney(total)}</span>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="mt-3 w-full rounded-full py-3 text-[14px] font-medium transition hover:opacity-90"
                    style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}
                  >
                    Next: your details →
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="mt-2 w-full text-center text-[12px] transition hover:text-magenta"
                    style={{ color: "var(--color-ink-soft)" }}
                  >
                    ← Back to image
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Step 3: Send */
            <form onSubmit={handleSend} className="mx-auto max-w-[480px] space-y-5">
              <h2 className="text-[20px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>3. Your details</h2>

              {/* Order summary */}
              <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}>
                <div className="flex gap-3">
                  {preview && <img src={preview} alt="Preview" className="poster-frame poster-frame-mini h-16 w-12 rounded-[6px] object-cover shrink-0" />}
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: "var(--color-ink)" }}>Custom print · {size} · {finish}</p>
                    <p className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>Qty {qty} · {formatMoney(total)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--color-ink-soft)" }} htmlFor="custom-name">Your name *</label>
                <input id="custom-name" maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className={fieldCls} style={fieldStyle} />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--color-ink-soft)" }} htmlFor="custom-phone">Phone number *</label>
                <input id="custom-phone" maxLength={20} required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={fieldCls} style={fieldStyle} />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--color-ink-soft)" }} htmlFor="custom-note">Notes (optional)</label>
                <textarea id="custom-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any special instructions — cropping, orientation, colour adjustments…" rows={3} className={`${fieldCls} resize-none`} style={fieldStyle} />
              </div>

              <div className="rounded-[12px] border p-4 text-[13px]" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>
                <p className="font-semibold" style={{ color: "var(--color-ink)" }}>What happens next</p>
                <p className="mt-1">We&rsquo;ll prepare your request for WhatsApp or Instagram. Send it in your chosen chat. <strong>Attach your image file</strong> in that message and hit send. We&rsquo;ll confirm details, collect payment, and ship within 4–6 days.</p>
              </div>

              {sendError && <p role="alert" className="account-error">{sendError}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-full border py-3 text-[14px] font-medium transition hover:border-ink" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}>← Back</button>
                <button type="submit" name="channel" value="instagram" disabled={sending} className="flex-1 rounded-full py-3 text-[14px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>
                  Send on Instagram →
                </button>
                <button type="submit" name="channel" value="whatsapp" disabled={sending} className="w-full rounded-full border py-3 text-[14px] font-medium text-purple transition hover:bg-yellow" style={{borderColor:"var(--color-purple)"}}>Send on WhatsApp →</button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
