import { getBackendClient } from "./backendClient"

/** Signed-in customer data stored on the backend (wishlist, orders). */

export async function loadWishlistIds(): Promise<string[]> {
  const res = await getBackendClient().request("/api/wishlist?ids=true")
  if (!res.success || !Array.isArray(res.data)) throw new Error(res.message)
  return res.data.map(String)
}

export async function addWishlistItem(productId: string) {
  const res = await getBackendClient().request("/api/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId }),
  })
  if (!res.success) throw new Error(res.message)
}

export async function removeWishlistItem(productId: string) {
  const res = await getBackendClient().request(
    `/api/wishlist?productId=${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  )
  if (!res.success) throw new Error(res.message)
}

export type MyOrder = {
  id: string
  ref: string
  status: string
  total: number
  placedAt: number
  items: { name: string; variant: string; qty: number; price: number }[]
  trackingNumber?: string
  shippingProvider?: string
}

export async function loadMyOrders(limit = 20, offset = 0): Promise<MyOrder[]> {
  const res = await getBackendClient().request(
    `/api/order?limit=${limit}&offset=${offset}`,
  )
  if (!res.success || !Array.isArray(res.data)) throw new Error(res.message)
  return res.data.map((o: any) => {
    const placed = new Date(o.orderedAt ?? o.createdAt).getTime()
    return {
      id: String(o.orderId),
      ref: String(o.orderId || "").slice(0, 8).toUpperCase(),
      status: String(o.status || "PENDING"),
      total: Number(o.totalAmount) || 0,
      placedAt: Number.isFinite(placed) ? placed : Date.now(),
      items: (o.orderItems || []).map((i: any) => ({
        name: String(i.productName || "Print"),
        variant: String(i.variantLabel || i.variantName || ""),
        qty: Number(i.quantity) || 1,
        price: Number(i.price) || 0,
      })),
      trackingNumber: o.trackingNumber || undefined,
      shippingProvider: o.shippingProvider || undefined,
    }
  })
}
