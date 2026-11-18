import { getBackendClient } from "./backendClient"
import { ensureCheckoutSession } from "./auth"
import { API_CONFIG } from "./config"

/**
 * Online payments. The UI only calls the functions in this file.
 *
 * - Secret keys never exist in the browser. Order creation and signature
 *   verification run in the Java backend (/api/payment).
 * - The server recomputes the price from its own catalog, so the browser
 *   cannot change what gets charged.
 */

export type PaymentMode = "off" | "razorpay"

export const PAYMENT_MODE: PaymentMode = API_CONFIG.paymentMode
export const paymentsEnabled = PAYMENT_MODE !== "off"

/** productId/variantId are backend UUIDs (Poster.id / Poster.variantIds[size]). */
export type PaymentItem = { productId: string; variantId?: string; size: string; qty: number }

export type PaymentRequest = {
  ref: string
  /** Total in rupees. Used for display and as a cross-check; the server decides the real amount. */
  amount: number
  items: PaymentItem[]
  customer: {
    name: string
    phone: string
    email?: string
    address: string
    city: string
    pincode: string
  }
}

export type PaymentOrder = {
  mode: "razorpay"
  orderId: string
  /** Backend order UUID (needed by /api/payment?action=verify). */
  backendOrderId?: string
  amountPaise: number
  currency: string
  /** Public Razorpay key id (safe in the browser). */
  keyId?: string
}

export type PaymentProof = {
  orderId: string
  backendOrderId?: string
  paymentId: string
  signature: string
}

export class PaymentCancelled extends Error {
  constructor() {
    super("Payment cancelled")
    this.name = "PaymentCancelled"
  }
}

/**
 * The backend stores one free-text address and derives the shipping zone from
 * the 6-digit pincode inside it, so name, city and pincode are folded in here.
 */
function formatShippingAddress(c: PaymentRequest["customer"]): string {
  const address = c.address.trim()
  const pin = c.pincode.trim()
  const parts = [c.name.trim(), address, c.city.trim()].filter(Boolean)
  const line = parts.join(", ")
  return pin && !address.includes(pin) ? `${line} - ${pin}` : line
}

/** Replace the server-side cart with the given lines (used for multi-item checkout). */
async function syncServerCart(items: PaymentItem[]) {
  const client = getBackendClient()
  const cleared = await client.request('/api/cart', { method: 'DELETE' })
  if (!cleared.success) throw new Error(cleared.message || "Could not prepare your cart.")
  for (const it of items) {
    const added = await client.request('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: it.productId, variantId: it.variantId, quantity: it.qty }),
    })
    if (!added.success) throw new Error(added.message || "Could not add an item to your cart.")
  }
}

/** Step 1: create a payment order. */
export async function createPaymentOrder(req: PaymentRequest): Promise<PaymentOrder> {
  if (PAYMENT_MODE === "off") throw new Error("Online payments are not enabled.")
  await ensureCheckoutSession()
  const client = getBackendClient()
  
  const single = req.items.length === 1 ? req.items[0] : null
  if (!single) await syncServerCart(req.items)
  const response = await client.request('/api/payment?action=initiate', {
    method: 'POST',
    body: JSON.stringify({
      shippingAddress: formatShippingAddress(req.customer),
      phone: req.customer.phone,
      ...(single
        ? { item: { productId: single.productId, variantId: single.variantId, quantity: single.qty } }
        : {}),
    }),
  })

  if (!response.success || !response.data?.razorpayOrderId) {
    throw new Error(response.message || "Could not start the payment. Please try again.")
  }
  
  const data = response.data
  if (!/^order_[a-zA-Z0-9]+$/.test(data.razorpayOrderId) || 
      !Number.isSafeInteger(data.amount) || 
      data.amount <= 0 || 
      data.currency !== "INR" || 
      typeof data.keyId !== "string") {
    throw new Error("Invalid payment response.")
  }
  
  return { 
    mode: "razorpay", 
    orderId: data.razorpayOrderId, 
    backendOrderId: typeof data.orderId === "string" ? data.orderId : undefined,
    amountPaise: data.amount, 
    currency: data.currency, 
    keyId: data.keyId 
  }
}

// ─── Razorpay checkout window ────────────────────────────────────────────────

type RazorpayInstance = {
  open: () => void
  on: (event: string, cb: (response: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

let scriptLoading: Promise<void> | null = null
function loadRazorpayScript(): Promise<void> {
  if (typeof window.Razorpay === "function") return Promise.resolve()
  if (scriptLoading) return scriptLoading
  const pending = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay]")
    const script = existing ?? document.createElement("script")
    let finished = false
    const cleanup = () => {
      clearTimeout(timer)
      script.removeEventListener("load", loaded)
      script.removeEventListener("error", failed)
    }
    const fail = () => {
      if (finished) return
      finished = true
      cleanup()
      script.remove()
      reject(new Error("Could not load the Razorpay payment window. Check your connection and try again."))
    }
    const loaded = () => {
      if (typeof window.Razorpay !== "function") { fail(); return }
      if (finished) return
      finished = true
      cleanup()
      resolve()
    }
    const failed = () => fail()
    const timer = setTimeout(fail, 15000)
    script.addEventListener("load", loaded)
    script.addEventListener("error", failed)
    if (!existing) {
      script.src = API_CONFIG.razorpayScriptUrl
      script.async = true
      script.dataset.razorpay = "1"
      document.body.appendChild(script)
    }
  })
  scriptLoading = pending.catch(error => { scriptLoading = null; throw error })
  return scriptLoading
}

/** Step 2 (live mode): open the Razorpay payment window. Resolves with proof of payment. */
export async function openRazorpay(
  order: PaymentOrder,
  prefill: { name: string; contact: string; email?: string },
  description: string,
): Promise<PaymentProof> {
  if (order.mode !== "razorpay" || !/^order_[A-Za-z0-9]+$/.test(order.orderId) ||
    !Number.isSafeInteger(order.amountPaise) || order.amountPaise <= 0 ||
    order.currency !== "INR" || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(order.keyId || ""))
    throw new Error("Invalid Razorpay checkout order.")
  await loadRazorpayScript()
  if (!window.Razorpay) throw new Error("Payment window is unavailable.")
  const Razorpay = window.Razorpay
  return new Promise<PaymentProof>((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      order_id: order.orderId,
      name: API_CONFIG.brandName,
      description,
      prefill: { name: prefill.name, contact: prefill.contact, email: prefill.email },
      theme: { color: API_CONFIG.brandColor },
      retry: { enabled: false },
      handler: (r: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string } | null) => {
        if (r?.razorpay_order_id !== order.orderId || !/^pay_[A-Za-z0-9]+$/.test(r?.razorpay_payment_id || "") ||
          !/^[a-f0-9]{64}$/i.test(r?.razorpay_signature || "")) {
          reject(new Error("Razorpay returned an invalid payment response. Check your payment app before retrying."))
          return
        }
        resolve({ orderId: r.razorpay_order_id, backendOrderId: order.backendOrderId, paymentId: r.razorpay_payment_id!, signature: r.razorpay_signature! })
      },
      modal: { ondismiss: () => reject(new PaymentCancelled()) },
    })
    rzp.on("payment.failed", (response: unknown) => {
      const desc = (response as { error?: { description?: string } })?.error?.description
      reject(new Error(desc || "Payment was not confirmed. Check your payment app before retrying."))
    })
    rzp.open()
  })
}

/** Step 3: have the server confirm the payment is genuine. */
export async function verifyPayment(proof: PaymentProof): Promise<{ ok: boolean }> {
  if (PAYMENT_MODE === "off") throw new Error("Online payments are not enabled.")
  
  await ensureCheckoutSession()
  if (!proof.backendOrderId) throw new Error("Missing order reference. Please try again.")
  const client = getBackendClient()
  
  // Call backend payment verification API
  const response = await client.request('/api/payment?action=verify', {
    method: 'POST',
    body: JSON.stringify({
      orderId: proof.backendOrderId,
      razorpayOrderId: proof.orderId,
      razorpayPaymentId: proof.paymentId,
      razorpaySignature: proof.signature
    })
  })
  
  if (!response.success) {
    throw new Error(response.message || "Payment verification failed.")
  }
  
  return { ok: response.success }
}
