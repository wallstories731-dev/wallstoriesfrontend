import { getBackendClient } from "./backendClient"

export type ShippingQuote = {
  serviceable: boolean
  /** Shipping fee in rupees (0 when free or not serviceable). */
  fee: number
  freeShipping: boolean
  estimatedDays: number
}

/** Delhivery serviceability + rate for a destination pincode. The server recomputes the real fee at payment. */
export async function quoteShipping(pincode: string, quantity: number, subtotal: number): Promise<ShippingQuote> {
  const client = getBackendClient()
  const pin = encodeURIComponent(pincode)
  const [check, rate] = await Promise.all([
    client.request<{ serviceable: boolean; estimatedDays: number }>(`/api/shipping?action=check&pincode=${pin}`),
    client.request<{ shippingFee: number; freeShipping: boolean }>(
      `/api/shipping?action=rate&pincode=${pin}&quantity=${Math.max(1, quantity)}&subtotal=${Math.max(0, subtotal)}`,
    ),
  ])
  if (!check.success || !check.data) throw new Error(check.message || "Could not check delivery to this pincode.")
  if (!check.data.serviceable) {
    return { serviceable: false, fee: 0, freeShipping: false, estimatedDays: 0 }
  }
  if (!rate.success || !rate.data) throw new Error(rate.message || "Could not calculate shipping.")
  return {
    serviceable: true,
    fee: Number(rate.data.shippingFee) || 0,
    freeShipping: !!rate.data.freeShipping,
    estimatedDays: Number(check.data.estimatedDays) || 0,
  }
}
