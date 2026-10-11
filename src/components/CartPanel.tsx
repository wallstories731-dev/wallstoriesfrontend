import { makeOrderReference } from "../api/orderRef"
import useModal from "../hooks/useModal"
import { useEffect, useRef, useState } from "react"
import { useStore, type SentOrder, type SentOrderLine } from "../context/StoreContext"
import { useOffers } from "../context/OffersContext"
import {
  getContactSettings,
  paymentsEnabled,
  isTestMode,
  createPaymentOrder,
  openRazorpay,
  verifyPayment,
  PaymentCancelled,
  type PaymentProof,
} from "../api"
import { formatMoney, priceFor, SIZE_DIMS, type SizeKey } from "../data/shop"
import { copyText, type DetailedLine } from "../hooks/useCart"
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  FrameIcon,
  InstagramIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  WhatsAppIcon,
} from "./icons"

// ─── Order message builder ────────────────────────────────────────────────────

function buildMessage(
  lines: DetailedLine[],
  total: number,
  name: string,
  city: string,
  pincode: string,
  note: string,
  ref: string,
) {
  const items = lines.map((l, i) =>
    (i + 1) + ". " + l.qty + "× " + l.poster.title + " (" + l.poster.code + ") · " +
    l.size + " · " + formatMoney(l.unit) + " each · " + formatMoney(l.subtotal)
  ).join("\n")
  return [
    "Hi Wall Stories! I'd like to order:",
    "Reference: " + ref,
    "",
    items,
    "",
    "Total items: " + lines.reduce((count, line) => count + line.qty, 0),
    "Estimated subtotal: " + formatMoney(total),
    "Paper: 300 GSM",
    "Shipping and final total to be confirmed in chat. Payment not yet made.",
    "",
    "Name: " + name.trim(),
    "City: " + city.trim(),
    "Pincode: " + pincode.trim(),
    ...(note.trim() ? ["Note: " + note.trim()] : []),
  ].join("\n")
}

// ─── Reference code generator ────────────────────────────────────────────────

const makeOnlineRef = makeOrderReference

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  id, label, value, onChange, placeholder, required, error, type = "text", textarea,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  required?: boolean
  error?: string
  type?: string
  textarea?: boolean
}) {
  const cls = `mt-1.5 w-full rounded-[10px] border px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/50 transition focus:outline-none ${
    error
      ? "border-danger bg-danger-soft focus:border-danger"
      : "border-hairline bg-ground-soft focus:border-magenta focus:bg-ground"
  }`
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1 text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {label}
        {required && <span className="text-magenta" aria-hidden="true">*</span>}
      </label>
      {textarea ? (
        <textarea aria-invalid={!!error} aria-describedby={error ? id+"-error" : undefined} maxLength={id === "cp-note" ? 1000 : 500} id={id} rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${cls} resize-none`} />
      ) : (
        <input aria-invalid={!!error} aria-describedby={error ? id+"-error" : undefined} maxLength={id === "cp-name" || id === "cp-city" ? 100 : id === "cp-email" ? 254 : id === "cp-phone" ? 10 : 6} id={id} type={type} inputMode={type === "tel" ? "numeric" : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {error && <p id={id+"-error"} role="alert" className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  )
}

// ─── Qty button ───────────────────────────────────────────────────────────────

function QtyBtn({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft hover:text-ink active:scale-90"
    >
      {children}
    </button>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ uniquePrints }: { uniquePrints: number }) {
  const { config } = useOffers()
  const { bundleRule } = config
  if (!bundleRule.enabled || paymentsEnabled) return null
  const threshold = bundleRule.minItems
  const discountPct = bundleRule.discountPercent
  const remaining = Math.max(0, threshold - uniquePrints)
  const pct = Math.min(1, uniquePrints / threshold) * 100

  if (remaining === 0) {
    return (
      <div className="rounded-[10px] border border-success/30 bg-success-soft px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CheckIcon className="h-3.5 w-3.5 text-success shrink-0" />
          <p className="text-[12px] font-medium text-success">{discountPct}% bundle offer — confirm with the seller</p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-success/25">
          <div className="h-full rounded-full bg-success" style={{ width: "100%" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-hairline bg-ground-soft/70 px-3 py-2">
      <p className="text-[12px] text-ink-soft">
        Add <span className="font-medium text-ink">{remaining} more {remaining === 1 ? "print" : "prints"}</span> to request <span className="font-medium text-magenta">{discountPct}%</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full bg-magenta transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── "What happens next" confirmation ────────────────────────────────────────

const NEXT_STEPS = [
  {
    step: "01",
    title: "Seller reviews your list",
    body: "You'll get a reply in the chat within a few hours — usually faster.",
  },
  {
    step: "02",
    title: "Confirm sizes & pay by UPI",
    body: "A UPI QR or link comes through in chat. No advance is charged here.",
  },
  {
    step: "03",
    title: "Printed and shipped in 1–2 days",
    body: "Rolled in a protective sleeve, sent via tracked courier. Arrives in 4–6 days.",
  },
]

const PAID_STEPS = [
  {
    step: "01",
    title: "Payment received",
    body: "Your order is confirmed. We'll message you if we need anything about sizes or your address.",
  },
  {
    step: "02",
    title: "Printed and shipped in 1–2 days",
    body: "Rolled in a protective sleeve and sent via tracked courier.",
  },
  {
    step: "03",
    title: "Arrives in 4–6 days",
    body: "Questions? Quote your order reference when you message us.",
  },
]

function ConfirmationView({
  order,
  onClose,
  message,
  onEdit,
}: {
  order: SentOrder
  message: string
  onClose: () => void
  onEdit: () => void
}) {
  const [copyStatus, setCopyStatus] = useState("")
  const { shop } = useStore()
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 px-6 py-8">
        {/* Reference */}
        <div className="mb-8 rounded-[14px] border border-hairline bg-ground-soft p-5 text-center">
          <p className="text-[11px] tracking-[0.2em] text-magenta uppercase">Order reference</p>
          <p
            className="mt-1 tracking-[0.06em] text-[28px] text-ink"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {order.ref}
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">Save this — quote it if you message again.</p>
        </div>

        {/* Status chip */}
        {order.payment ? (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-center gap-2 rounded-full border border-success/30 bg-success-soft px-4 py-2">
              <CheckIcon className="h-3.5 w-3.5 text-success" />
              <span className="text-[12px] font-medium text-success">
                {order.payment.test ? "Test payment completed" : "Payment received — thank you!"}
              </span>
            </div>
            {order.payment.test && (
              <p className="text-center text-[11px] text-ink-soft">
                Test mode: no real money was taken and this order is not confirmed.
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-full border border-yellow bg-yellow/30 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-[12px] font-medium text-ink">Order prepared · awaiting your send and seller confirmation</span>
          </div>
        )}

        {!order.payment && <div className="chat-handoff">
          <p>{order.via === "whatsapp" ? "Your order text is filled in WhatsApp. Review it and tap Send." : order.via === "instagram" ? "Copy the order below, paste it into Instagram, then tap Send." : "Paste this order into your preferred chat, then tap Send."}</p>
          <label>Your prepared message<textarea readOnly value={message} rows={8} aria-label="Prepared order message" onFocus={e=>e.currentTarget.select()}/></label>
          <div className="chat-handoff-actions"><a href={"https://wa.me/"+getContactSettings().whatsappNumber+"?text="+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">Open WhatsApp</a><button onClick={async()=>{window.open("https://ig.me/m/"+shop.instagramUsername,"_blank","noopener,noreferrer");const ok=await copyText(message);setCopyStatus(ok?"Copied. Paste and send in Instagram.":"Select the message above and copy it manually, then paste in Instagram.")}}>Copy &amp; open Instagram</button><button onClick={async()=>{const ok=await copyText(message);setCopyStatus(ok?"Order copied.":"Select the message above and copy it manually.")}}>Copy order message</button><button onClick={onEdit}>Edit selection</button></div>
          {copyStatus&&<p role="status">{copyStatus}</p>}
          <p>Your selection is saved. Sharing prepares a message; the seller confirms the order in chat.</p>
        </div>}
        {/* 3 steps */}
        <p className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">What happens next</p>
        <div className="space-y-4">
          {(order.payment?.test ? [{step:"01",title:"Test checkout completed",body:"No real money was taken. This test receipt does not confirm an order for printing."}] : order.payment ? PAID_STEPS : NEXT_STEPS).map((s) => (
            <div key={s.step} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-hairline text-[11px] font-semibold text-ink-soft"
              >
                {s.step}
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-medium text-[14px] text-ink">{s.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="mt-8 rounded-[12px] border border-hairline p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Your order</p>
          <ul className="space-y-1.5">
            {order.lines.map((l, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-ink-soft">
                  {l.qty}× {l.title} <span className="text-magenta">({l.code})</span> · {l.size}
                </span>
                <span className="shrink-0 font-medium text-ink">{formatMoney(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-[12px] text-ink-soft">{order.payment?.test ? "Test total" : order.payment ? "Total paid" : "Estimated subtotal"}</span>
            <span className="font-semibold text-[16px] text-ink">{formatMoney(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline px-6 py-5">
        <button
          type="button"
          onClick={onClose}
          className="flex w-full min-h-[48px] items-center justify-center rounded-full bg-ground-soft text-[14px] font-medium text-ink transition hover:bg-hairline"
        >
          Browse more prints
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
      <div className="wall-texture flex h-28 w-24 items-center justify-center rounded-[10px] shadow-[0_10px_30px_-18px_rgba(8,2,14,0.6)]">
        <FrameIcon className="h-10 w-10 text-ink/25" />
      </div>
      <p className="max-w-[16rem] font-display font-semibold tracking-[-0.02em] text-[19px] leading-snug text-ink">
        No posters picked yet — go find some art you love.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[44px] rounded-full border border-ink/25 px-5 py-2.5 text-[13px] text-ink transition hover:border-yellow hover:bg-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
      >
        Browse the catalogue
      </button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
  onToast: (msg: string) => void
}

type FormErrors = Partial<Record<"name" | "city" | "pincode" | "phone" | "address" | "email", string>>

export default function CartPanel({ open, onClose, onToast }: Props) {
  const store = useStore()
  const { cartDetailed: lines, cartCount: count, cartTotal: total, setCartQty, removeFromCart, changeLineSize, shop, addSentOrder, clearCart } = store

  // Form state
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [pincode, setPincode] = useState("")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState(false)

  // Online payment
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [checkoutTest, setCheckoutTest] = useState(false)
  const [mockSheet, setMockSheet] = useState<null | { amount: number; done: (ok: boolean) => void }>(null)

  // View: "selection" while browsing/filling in, "sent" after dispatching
  const [preparedMessage, setPreparedMessage] = useState("")
  const [sentOrder, setSentOrder] = useState<SentOrder | null>(null)

  const dialogRef = useModal(open, () => { if(mockSheet) mockSheet.done(false); if(!paying) onClose() }, paying)
  const mockDialogRef = useModal(!!mockSheet, () => mockSheet?.done(false))

  // Reset confirmation when panel is closed and re-opened
  useEffect(() => {
    if (open) setSentOrder(null)
  }, [open])

  if (!open) return null

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!name.trim()) errs.name = "Name is required"
    if (!city.trim()) errs.city = "City is required"
    if (!pincode.trim() || !/^[1-9]\d{5}$/.test(pincode.trim())) errs.pincode = "Enter a valid 6-digit pincode"
    return errs
  }

  function validateOnline(): FormErrors {
    const errs = validate()
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))) {
      errs.phone = "Enter a 10-digit mobile number"
    }
    if (address.trim().length < 8) errs.address = "Enter your full delivery address"
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email or leave it blank"
    return errs
  }

  // ── Unique print count for progress bar ─────────────────────────────────────

  const uniquePrints = new Set(lines.map((l) => l.posterId)).size

  // ── Order build ─────────────────────────────────────────────────────────────

  function buildOrder(via: SentOrder["via"]): SentOrder {
    const orderLines: SentOrderLine[] = lines.map((l) => ({
      title: l.poster.title,
      code: l.poster.code,
      size: l.size,
      qty: l.qty,
      price: l.unit,
    }))
    return {
      ref: makeOnlineRef(),
      lines: orderLines,
      name: name.trim(),
      phone: "",
      city: city.trim(),
      pincode: pincode.trim(),
      note: note.trim(),
      total,
      sentAt: Date.now(),
      via,
      status: "sent",
    }
  }

  function attemptSend(cb: (order: SentOrder, message: string) => void) {
    if (paying || !lines.length) return
    setTouched(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) { document.getElementById("cp-" + Object.keys(errs)[0])?.focus(); return }
    const order = buildOrder("copy") // via overridden by caller
    const message = buildMessage(lines, total, name, city, pincode, note, order.ref)
    setPreparedMessage(message)
    cb(order, message)
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handleInstagram = () => {
    attemptSend(async (order, message) => {
      const o = { ...order, via: "instagram" as const }
      window.open("https://ig.me/m/"+shop.instagramUsername, "_blank", "noopener,noreferrer")
      setSentOrder(o)
      const copied = await copyText(message)
      addSentOrder(o)
      onToast(copied ? "Copied — paste and send it in the chat" : "Copy was blocked. Copy the prepared message below.")
    })
  }

  const handleWhatsApp = () => {
    attemptSend((order, message) => {
      const o = { ...order, via: "whatsapp" as const }
      addSentOrder(o)
      const url = `https://wa.me/${getContactSettings().whatsappNumber}?text=${encodeURIComponent(message)}`
      window.open(url, "_blank", "noopener,noreferrer")
      setSentOrder(o)
    })
  }

  const handleCopy = () => {
    attemptSend(async (order, message) => {
      const o = { ...order, via: "copy" as const }
      setSentOrder(o)
      const ok = await copyText(message)
      addSentOrder(o)
      onToast(ok ? "Order copied — paste it into any chat." : "Copy failed — select the text manually.")
    })
  }

  // ── Online payment ───────────────────────────────────────────────────────────

  const askMockPayment = (amount: number) =>
    new Promise<boolean>((resolve) => setMockSheet({ amount, done: (ok: boolean) => { setMockSheet(null); resolve(ok) } }))

  const handlePay = async () => {
    if (paying) return
    if (!paymentsEnabled) {
      setPayError("Online checkout is currently unavailable. Send your selection on WhatsApp to confirm your order and arrange payment.")
      window.requestAnimationFrame(() => document.getElementById("cp-payment-error")?.focus())
      return
    }
    setTouched(true)
    setPayError("")
    const errs = validateOnline()
    setErrors(errs)
    if (Object.keys(errs).length > 0) { document.getElementById("cp-" + Object.keys(errs)[0])?.focus(); return }

    const ref = makeOnlineRef()
    const snapshot = buildOrder("online")
    const digits = phone.replace(/\D/g, "").slice(-10)
    setPaying(true)
    try {
      const paymentOrder = await createPaymentOrder({
        ref,
        amount: total,
        items: lines.map((l: DetailedLine) => ({ posterId: l.posterId, size: l.size, qty: l.qty })),
        customer: {
          name: name.trim(), phone: digits, email: email.trim() || undefined,
          address: address.trim(), city: city.trim(), pincode: pincode.trim(),
        },
      })

      const testPayment = paymentOrder.mode === "mock" || !!paymentOrder.keyId?.startsWith("rzp_test_")
      setCheckoutTest(testPayment)
      let proof: PaymentProof
      if (paymentOrder.mode === "mock") {
        const ok = await askMockPayment(total)
        if (!ok) throw new Error("Test payment failed. You have not been charged.")
        proof = { orderId: paymentOrder.orderId, paymentId: `mock_pay_${Date.now()}`, signature: "mock" }
      } else {
        proof = await openRazorpay(
          paymentOrder,
          { name: name.trim(), contact: digits, email: email.trim() || undefined },
          `${count} ${count === 1 ? "print" : "prints"} · ${ref}`,
        )
      }

      const verified = await verifyPayment(proof)
      if (!verified.ok) throw new Error("We could not confirm your payment. If money was deducted, message us with your reference " + ref + ".")

      const o: SentOrder = {
        ...snapshot,
        ref,
        phone: digits,
        address: address.trim(),
        payment: { id: proof.paymentId, method: testPayment ? "Razorpay test" : "Razorpay", status: "paid", test: testPayment },
      }
      addSentOrder(o)
      clearCart()
      setSentOrder(o)
    } catch (err) {
      if (err instanceof PaymentCancelled) {
        onToast("Checkout closed. Check your payment app before retrying. Reference: " + ref)
      } else {
        setPayError((err instanceof Error ? err.message : "Payment was not confirmed. Check your payment app before retrying.") + " Reference: " + ref)
      }
    } finally {
      setPaying(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade absolute inset-0 bg-ink/45 backdrop-blur-[3px]" onClick={()=>{if(!paying)onClose()}} aria-hidden="true" />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your selection"
        className="animate-slide-in relative flex h-full w-full max-w-[460px] flex-col bg-ground shadow-[-20px_0_60px_-30px_rgba(8,2,14,0.7)]"
      >
        {/* Header */}
        <header className="flex items-baseline justify-between border-b border-hairline px-6 py-5">
          <div>
            <h2 className="font-display font-semibold tracking-[-0.02em] text-[22px] leading-none text-ink">
              {sentOrder ? (sentOrder.payment ? "Order placed" : "Order prepared") : "Your selection"}
            </h2>
            <p className="mt-1.5 text-[12px] text-ink-soft">
              {sentOrder
                ? `Ref: ${sentOrder.ref}`
                : count === 0
                ? "Nothing picked yet"
                : `${count} ${count === 1 ? "print" : "prints"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={paying}
            aria-label="Close selection"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        {sentOrder ? (
          <ConfirmationView order={sentOrder} message={preparedMessage} onClose={onClose} onEdit={()=>setSentOrder(null)} />
        ) : lines.length === 0 ? (
          <EmptyState onClose={onClose} />
        ) : (
          <>
            <div className="rail flex-1 overflow-y-auto px-6">
              {/* Line items */}
              <ul className="divide-y divide-hairline">
                {lines.map((line) => (
                  <LineItem
                    key={line.key}
                    line={line}
                    disabled={paying}
                    onSetQty={(q) => setCartQty(line.posterId, line.size, q)}
                    onRemove={() => removeFromCart(line.posterId, line.size)}
                    onChangeSize={(newSize) => changeLineSize(line.posterId, line.size, newSize)}
                  />
                ))}
              </ul>

              {/* Progress bar */}
              <div className="mt-4">
                <ProgressBar uniquePrints={uniquePrints} />
              </div>

              {/* Customer form */}
              <div className="mt-5 space-y-3 border-t border-hairline pt-5 pb-6">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">Your details</p>
                <fieldset disabled={paying} aria-label="Customer details" className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field
                      id="cp-name" label="Name" value={name} onChange={setName}
                      placeholder="Your name" required
                      error={touched ? errors.name : undefined}
                    />
                  </div>
                  <Field
                    id="cp-city" label="City" value={city} onChange={setCity}
                    placeholder="Mumbai" required
                    error={touched ? errors.city : undefined}
                  />
                  <Field
                    id="cp-pincode" label="Pincode" value={pincode} onChange={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit" required type="text"
                    error={touched ? errors.pincode : undefined}
                  />
                  {paymentsEnabled && (
                    <>
                      <div className="col-span-2 -mb-1 mt-1">
                        <p className="text-[11px] leading-relaxed text-ink-soft">
                          Needed only if you pay online:
                        </p>
                      </div>
                      <Field
                        id="cp-phone" label="Mobile" value={phone}
                        onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit number" type="tel"
                        error={touched ? errors.phone : undefined}
                      />
                      <Field
                        id="cp-email" label="Email (optional)" value={email} onChange={setEmail}
                        placeholder="for your receipt" type="email"
                        error={touched ? errors.email : undefined}
                      />
                      <div className="col-span-2">
                        <Field
                          id="cp-address" label="Delivery address" value={address} onChange={setAddress}
                          placeholder="House no., street, area" textarea
                          error={touched ? errors.address : undefined}
                        />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <Field
                      id="cp-note" label="Note (optional)" value={note} onChange={setNote}
                      placeholder="Anything the seller should know…"
                      textarea
                    />
                  </div>
                </fieldset>
              </div>
            </div>

            {/* Footer */}
            <footer className="shrink-0 max-h-[55dvh] overflow-y-auto border-t border-hairline bg-ground px-6 py-5">
              {/* Total row */}
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] tracking-[0.14em] text-ink-soft uppercase">
                  {count} {count === 1 ? "item" : "items"} · estimated
                </span>
                <span
                  className="tabular-nums text-[26px] leading-none text-ink"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                >
                  {formatMoney(total)}
                </span>
              </div>

              {/* Shipping note */}
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                {paymentsEnabled
                  ? "Pay online now, or send your list and pay in chat"
                  : "Shipping confirmed in chat — no payment taken here"}
              </p>

              {/* Actions */}
              <div className="mt-4 grid gap-2.5">
                <div className="online-payment-option">
                    <div className="payment-heading"><span>Razorpay online payment</span><span className="payment-status">{paymentsEnabled ? ((isTestMode || checkoutTest) ? "Test checkout" : "Razorpay checkout") : "Currently unavailable"}</span></div>
                    {payError && (
                      <p id="cp-payment-error" tabIndex={-1} role="alert" className="rounded-[10px] border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                        {payError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={paying}
                      aria-describedby={!paymentsEnabled ? "cp-payment-availability" : undefined}
                      className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-6 text-[14px] font-medium tracking-wide text-[var(--color-ground)] shadow-[0_10px_24px_-12px_rgba(8,2,14,0.8)] transition hover:opacity-90 active:scale-[0.985] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                      {paying ? "Starting payment…" : `Pay ${formatMoney(total)} online · Razorpay`}
                    </button>
                    <p className="text-center text-[11px] text-ink-soft">
                      UPI, cards and net banking via Razorpay{(isTestMode || checkoutTest) ? " · TEST MODE, no real money" : ""}
                    </p>

                    {!paymentsEnabled && <p id="cp-payment-availability" className="payment-availability">Order in chat while online checkout is unavailable.</p>}
                </div>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  disabled={paying}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 text-[14px] font-medium tracking-wide text-[#103320] shadow-[0_10px_24px_-12px_rgba(37,211,102,0.7)] transition hover:bg-[#20c05b] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)]"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Send on WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleInstagram}
                  disabled={paying}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[var(--color-magenta)] px-6 text-[14px] font-medium tracking-wide text-[var(--color-ground)] shadow-[0_10px_24px_-12px_rgba(229,21,127,0.9)] transition hover:bg-[var(--color-magenta-deep)] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)]"
                >
                  <InstagramIcon className="h-4 w-4" />
                  Send on Instagram
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={paying}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[var(--color-ink)]/20 px-6 text-[14px] text-[var(--color-ink)] transition hover:border-[var(--color-yellow)] hover:bg-[var(--color-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)]"
                >
                  <CopyIcon className="h-4 w-4" />
                  Copy my order
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
                {paymentsEnabled ? "Chat orders are confirmed with you before any payment" : "Orders for WhatsApp/Instagram only — confirmed in chat"}
              </p>
            </footer>
          </>
        )}
        {mockSheet && (
          <div ref={mockDialogRef} className="absolute inset-0 z-10 flex items-end bg-ink/50 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Test payment">
            <div className="w-full rounded-t-[18px] bg-ground p-6 shadow-xl sm:max-w-[360px] sm:rounded-[18px]">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-magenta uppercase">Test mode</p>
              <p className="mt-1 text-[22px] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                Pay {formatMoney(mockSheet.amount)}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                This is a simulated payment so you can try the full flow. No real money is taken.
              </p>
              <div className="mt-5 grid gap-2.5">
                <button type="button" onClick={() => mockSheet.done(true)} className="min-h-[46px] rounded-full bg-[var(--color-success)] px-5 text-[14px] font-medium text-white">
                  Simulate successful payment
                </button>
                <button type="button" onClick={() => mockSheet.done(false)} className="min-h-[44px] rounded-full border border-hairline px-5 text-[14px] text-ink">
                  Simulate failed payment
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

// ─── Line item ────────────────────────────────────────────────────────────────

function LineItem({
  line,
  disabled,
  onSetQty,
  onRemove,
  onChangeSize,
}: {
  line: DetailedLine
  disabled?: boolean
  onSetQty: (qty: number) => void
  onRemove: () => void
  onChangeSize: (size: SizeKey) => void
}) {
  return (
    <li className="flex gap-4 py-5">
      <img
        src={line.poster.image}
        alt={line.poster.alt}
        className="poster-frame poster-frame-mini h-24 w-[72px] shrink-0 rounded-[6px] object-contain shadow-[0_4px_12px_-6px_rgba(0,0,0,0.6)]"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display font-semibold tracking-[-0.02em] text-[15px] text-ink">{line.poster.title}</h3>
            <p className="mt-0.5 text-[11px] tracking-[0.12em] text-magenta uppercase">{line.poster.code}</p>
          </div>
          <button
            type="button"
            aria-label={`Remove ${line.poster.title}`}
            disabled={disabled}
            onClick={onRemove}
            className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-magenta/10 hover:text-magenta"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Size dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor={`size-${line.key}`} className="text-[11px] tracking-[0.12em] text-ink-soft uppercase shrink-0">
            Size
          </label>
          <select
            id={`size-${line.key}`}
            value={line.size}
            disabled={disabled}
            onChange={(e) => onChangeSize(e.target.value as SizeKey)}
            className="flex-1 rounded-[8px] border border-hairline bg-ground-soft py-1.5 pl-2.5 pr-7 text-[13px] text-ink transition focus:border-magenta focus:outline-none appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236f5a7e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            {line.poster.sizes.map((s) => (
              <option key={s} value={s}>
                {s} — {SIZE_DIMS[s].cm} — {formatMoney(priceFor(line.poster, s))}
              </option>
            ))}
          </select>
        </div>

        {/* Qty + subtotal */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 rounded-full border border-hairline p-0.5">
            <QtyBtn label="Decrease" onClick={() => onSetQty(line.qty - 1)} disabled={disabled || line.qty <= 1}>
              <MinusIcon className="h-3.5 w-3.5" />
            </QtyBtn>
            <span className="w-7 text-center text-[13px] tabular-nums font-medium">{line.qty}</span>
            <QtyBtn label="Increase" onClick={() => onSetQty(line.qty + 1)} disabled={disabled || line.qty >= 20}>
              <PlusIcon className="h-3.5 w-3.5" />
            </QtyBtn>
          </div>
          <span className="text-[14px] font-semibold text-ink tabular-nums">{formatMoney(line.subtotal)}</span>
        </div>
      </div>
    </li>
  )
}
