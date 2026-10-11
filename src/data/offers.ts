// ─── Types ──────────────────────────────────────────────────────────────────

export type BundleRule = {
  enabled: boolean
  minItems: number        // unique prints required
  discountPercent: number // 0–100
}

export type CouponCode = {
  id: string
  code: string            // uppercase, e.g. "SUMMER10"
  discountPercent: number
  expiresAt?: number      // ms timestamp, undefined = no expiry
  usageLimit?: number     // undefined = unlimited
  usedCount: number
  enabled: boolean
  description?: string
}

export type OffersConfig = {
  bundleRule: BundleRule
  coupons: CouponCode[]
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_OFFERS: OffersConfig = {
  bundleRule: { enabled: true, minItems: 3, discountPercent: 10 },
  coupons: [
    {
      id: "cpn-1",
      code: "WALLS10",
      discountPercent: 10,
      usageLimit: 50,
      usedCount: 12,
      enabled: true,
      description: "General 10% off",
    },
    {
      id: "cpn-2",
      code: "FIRSTORDER",
      discountPercent: 15,
      expiresAt: Date.now() + 30 * 86_400_000,
      usageLimit: 100,
      usedCount: 23,
      enabled: true,
      description: "First-time buyer discount",
    },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isCouponValid(coupon: CouponCode): boolean {
  if (!coupon.enabled) return false
  if (coupon.expiresAt && coupon.expiresAt < Date.now()) return false
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) return false
  return true
}
