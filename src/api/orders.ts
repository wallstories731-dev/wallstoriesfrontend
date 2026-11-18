import type { AdminOrder, OrderStatus } from '../data/adminOrders'
import { getBackendClient } from './backendClient'
import { requireAdmin } from './auth'

const PAGE_SIZE = 100

const FROM_BACKEND: Record<string, OrderStatus> = {
  PAYMENT_PENDING: 'new',
  PENDING: 'new',
  PAYMENT_FAILED: 'cancelled',
  PAID: 'paid',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'cancelled',
}

// Only statuses with a real backend equivalent can be written back.
const TO_BACKEND: Partial<Record<OrderStatus, string>> = {
  new: 'PENDING',
  confirmed: 'CONFIRMED',
  paid: 'PAID',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
}

const toMillis = (v: unknown) => {
  const t = v ? new Date(v as string | number).getTime() : NaN
  return Number.isFinite(t) ? t : Date.now()
}

export async function loadAdminOrders(): Promise<AdminOrder[]> {
  await requireAdmin()

  const client = getBackendClient()
  const rows: any[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await client.request(`/api/admin?type=order&limit=${PAGE_SIZE}&offset=${offset}`)
    if (!response.success || !Array.isArray(response.data)) throw new Error('Could not load orders.')
    rows.push(...response.data)
    if (response.data.length < PAGE_SIZE) break
  }

  return rows.map((order: any) => {
    const status: OrderStatus = FROM_BACKEND[String(order.status)] ?? 'new'
    const created = toMillis(order.orderedAt ?? order.createdAt)
    const address = String(order.shippingAddress || '')
    const items = (order.orderItems || []).map((item: any) => ({
      posterId: item.productId,
      posterTitle: item.productName || '',
      posterCode: '',
      size: item.variantLabel || item.variantName || '',
      qty: item.quantity || 1,
      unitPrice: item.price || 0,
      mrp: item.price || 0,
    }))
    const shipping = order.shippingFee || 0
    const total = order.totalAmount || 0

    return {
      id: order.orderId,
      ref: String(order.orderId || '').slice(0, 8).toUpperCase(),
      source: 'storefront',
      status,
      name: String(order.customerName || ''),
      phone: order.phone || '',
      email: String(order.customerEmail || ''),
      address,
      city: '',
      pincode: address.match(/\b(\d{6})\b/)?.[1] || '',
      items,
      subtotal: Math.max(0, total - shipping),
      discount: 0,
      shipping,
      total,
      paymentMethod: ['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(String(order.status)) ? 'Razorpay' : undefined,
      courier: order.shippingProvider || undefined,
      trackingId: order.trackingNumber || undefined,
      notes: [],
      timeline: [{ status, at: created }],
      via: 'online',
      createdAt: created,
      updatedAt: toMillis(order.updatedAt ?? order.orderedAt),
    } as AdminOrder
  })
}

export async function updateAdminOrder(id: string, patch: Record<string, unknown>) {
  await requireAdmin()

  const status = typeof patch.status === 'string' ? TO_BACKEND[patch.status as OrderStatus] : undefined
  if (!status) {
    throw new Error('Only order status changes (new, confirmed, paid, shipped, delivered, cancelled) are supported by the server.')
  }

  const client = getBackendClient()
  const response = await client.request(
    `/api/admin?${new URLSearchParams({ orderId: id, status }).toString()}`,
    { method: 'PUT' },
  )

  if (!response.success) {
    throw new Error(response.message || 'Order update failed.')
  }
}
