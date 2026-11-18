import { type SizeKey } from "./shop"

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "paid"
  | "printed"
  | "shipped"
  | "delivered"
  | "cancelled"

// Only statuses the backend can store (see api/orders.ts). "contacted"/"printed" remain in the type for legacy data.
export const ORDER_STATUSES: OrderStatus[] = [
  "new", "confirmed", "paid", "shipped", "delivered", "cancelled",
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  paid: "Paid",
  printed: "Printed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  new:       { bg: "bg-[var(--color-magenta)]/10",      text: "text-[var(--color-magenta)]",      border: "border-[var(--color-magenta)]/25" },
  contacted: { bg: "bg-[var(--color-yellow)]/20",       text: "text-[var(--color-ink)]",           border: "border-[var(--color-yellow)]/40" },
  confirmed: { bg: "bg-[var(--color-success)]/10",      text: "text-[var(--color-success)]",       border: "border-[var(--color-success)]/25" },
  paid:      { bg: "bg-[var(--color-success)]/20",      text: "text-[var(--color-success)]",       border: "border-[var(--color-success)]/40" },
  printed:   { bg: "bg-[var(--color-ink-soft)]/10",     text: "text-[var(--color-ink-soft)]",      border: "border-[var(--color-ink-soft)]/25" },
  shipped:   { bg: "bg-[var(--color-magenta-deep)]/10", text: "text-[var(--color-magenta-deep)]",  border: "border-[var(--color-magenta-deep)]/25" },
  delivered: { bg: "bg-[var(--color-success)]/15",      text: "text-[var(--color-success)]",       border: "border-[var(--color-success)]/30" },
  cancelled: { bg: "bg-[var(--color-danger)]/10",       text: "text-[var(--color-danger)]",        border: "border-[var(--color-danger)]/25" },
}

export type AdminOrderItem = {
  posterId: string
  posterTitle: string
  posterCode: string
  size: SizeKey
  qty: number
  unitPrice: number
  mrp: number
}

export type StatusEvent = {
  status: OrderStatus
  at: number
  note?: string
}

export type AdminNote = {
  id: string
  text: string
  createdAt: number
}

export type AdminOrder = {
  id: string
  ref: string
  source: "storefront" | "enquiry" | "manual"
  status: OrderStatus
  // Customer
  name: string
  phone: string
  email?: string
  city: string
  pincode: string
  address?: string
  // Items
  items: AdminOrderItem[]
  // Pricing
  subtotal: number
  discount: number
  shipping: number
  total: number
  // Payment
  paymentRef?: string
  paymentMethod?: string
  // Fulfillment
  courier?: string
  trackingId?: string
  // Meta
  notes: AdminNote[]
  timeline: StatusEvent[]
  via?: "instagram" | "whatsapp" | "copy" | "form" | "online"
  createdAt: number
  updatedAt: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeOrderRef(count: number) {
  const y = new Date().getFullYear()
  return `WS-${y}-${String(count + 1).padStart(4, "0")}`
}

// ─── Seed data ───────────────────────────────────────────────────────────────

function daysAgo(n: number) { return Date.now() - n * 86_400_000 }

export function seedAdminOrders(): AdminOrder[] { return [] }
