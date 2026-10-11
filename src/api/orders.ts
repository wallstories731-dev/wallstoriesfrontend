import type { AdminOrder, OrderStatus } from '../data/adminOrders'
import { getBackendClient } from './backendClient'
import { requireAdmin } from './auth'

export async function loadAdminOrders(): Promise<AdminOrder[]> {
  await requireAdmin()
  
  const client = getBackendClient()
  const response = await client.request('/api/order')
  
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Could not load orders.')
  }
  
  // Map backend orders to AdminOrder format
  return response.data.map((order: any) => {
    const status: OrderStatus = order.status || 'new'
    
    return {
      id: order.orderId || order.id,
      ref: order.orderId || order.id,
      source: 'storefront',
      status,
      name: order.customerName || '',
      phone: order.phone || '',
      email: order.email || '',
      address: order.shippingAddress || '',
      city: order.city || '',
      pincode: order.pincode || '',
      items: (order.orderItems || []).map((item: any) => ({
        posterId: item.productId,
        posterTitle: item.productName || '',
        posterCode: item.sku || '',
        size: item.variantName || '',
        qty: item.quantity || 1,
        unitPrice: item.price || 0,
        mrp: item.price || 0
      })),
      subtotal: order.totalAmount || 0,
      discount: 0,
      shipping: order.shippingFee || 0,
      total: order.totalAmount || 0,
      paymentRef: order.razorpayPaymentId || undefined,
      paymentMethod: order.razorpayPaymentId ? 'Razorpay' : undefined,
      notes: [],
      timeline: [{
        status,
        at: order.createdAt ? new Date(order.createdAt).getTime() : Date.now()
      }],
      courier: undefined,
      trackingId: undefined,
      via: 'online',
      createdAt: order.createdAt ? new Date(order.createdAt).getTime() : Date.now(),
      updatedAt: order.updatedAt ? new Date(order.updatedAt).getTime() : Date.now()
    } as AdminOrder
  })
}

export async function updateAdminOrder(id: string, patch: Record<string, unknown>) {
  await requireAdmin()
  
  const client = getBackendClient()
  const response = await client.request(`/api/order?orderID=${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch)
  })
  
  if (!response.success) {
    throw new Error('Order update failed. Payment state must be verified by the server; reload if another update was made.')
  }
}
