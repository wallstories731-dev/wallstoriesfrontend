/**
 * Seller-editable configuration.
 * Change the shop name, Instagram handle, currency and poster list here —
 * nothing else in the app needs to be touched.
 */
const defaultShop = {
  name: "WALLstories",
  tagline: "Premium wall posters",
  instagramUsername: "thewallstories_2026",
  currency: "₹",
}

export const shop = { ...defaultShop }

/** Empty = no featured print; the admin picks one (backend product UUID). */
export const featuredConfig = { posterId: "" }
export const featuredPosterId = featuredConfig.posterId

export function instagramDmUrl() {
  return `https://ig.me/m/${shop.instagramUsername}`
}

export type SizeKey = "A4" | "A3" | "A2" | "12×18" | "18×24"

export const SIZE_KEYS: SizeKey[] = ["A4", "A3", "A2", "12×18", "18×24"]

export const SIZE_DIMS: Record<SizeKey, { cm: string; inches: string }> = {
  A4: { cm: "21 × 29.7 cm", inches: '8.3 × 11.7"' },
  A3: { cm: "29.7 × 42 cm", inches: '11.7 × 16.5"' },
  A2: { cm: "42 × 59.4 cm", inches: '16.5 × 23.4"' },
  "12×18": { cm: "30.5 × 45.7 cm", inches: '12 × 18"' },
  "18×24": { cm: "45.7 × 61 cm", inches: '18 × 24"' },
}

/** Multiplier applied to a poster's base (A4) price. */
export const sizeMultiplier: Record<SizeKey, number> = {
  A4: 1,
  A3: 1.6,
  A2: 2.4,
  "12×18": 1.45,
  "18×24": 2.15,
}

const defaultCategories = ["All"]

export const categories: string[] = [...defaultCategories]

export type Category = string

export type PosterBadge = "new" | "bestseller" | "few-left"

export type Poster = {
  id: string
  /** Catalogue code the seller and customer both quote in chat, e.g. WS-MOV-01. */
  code: string
  title: string
  category: Exclude<Category, "All">
  /** Price for A4; every other size scales from this. */
  basePrice: number
  sizes: SizeKey[]
  image: string
  /** Extra carousel images shown in the detail view. The main `image` is always first. */
  carouselImages?: string[]
  alt: string
  description: string
  /** Higher = more recently added; drives the "Newest" sort. */
  added: number
  badge?: PosterBadge
  /** Admin-managed fields */
  orientation?: "portrait" | "square"
  status?: "active" | "draft"
  tags?: string[]
  featured?: boolean
  /** Per-size price overrides; falls back to basePrice * sizeMultiplier when absent. */
  customPrices?: Partial<Record<SizeKey, { price: number; mrp: number }>>
  /** Backend `product_variants.variant_id` per size; required to buy a specific size. */
  variantIds?: Partial<Record<SizeKey, string>>
}

/**
 * Hardcoded posters have been removed.
 * Products will now be loaded from the backend API.
 * This array is kept empty for backward compatibility.
 * 
 * To add products, use the admin panel after logging in with admin credentials.
 */
const defaultPosters: Poster[] = []

/**
 * Products are now loaded dynamically from the backend.
 * The StoreContext loads products via the catalog API.
 */
export const posters: Poster[] = [...defaultPosters]

export function previewImage(url: string, width = 480, quality = 45) {
  try {
    const u = new URL(url)
    u.searchParams.set("w", String(width))
    u.searchParams.set("h", String(Math.round((width * 4) / 3)))
    u.searchParams.set("q", String(quality))
    return u.toString()
  } catch {
    return url
  }
}

export function priceFor(poster: Poster, size: SizeKey) {
  return poster.customPrices?.[size]?.price ?? (Math.round((poster.basePrice * sizeMultiplier[size]) / 10) * 10 - 1)
}

export function formatMoney(amount: number) {
  return `${shop.currency}${amount.toLocaleString("en-IN")}`
}

/** Returns [main, room-mockup, close-up] image URLs for a poster. */
export function getPosterGallery(poster: Poster): string[] {
  return [...new Set([poster.image,...(poster.carouselImages || [])])]
}

export function estimateDelivery(pincode: string): string | null {
  if (!/^\d{6}$/.test(pincode)) return null
  const prefix = parseInt(pincode.slice(0, 2), 10)
  // Major metros: faster estimate
  if ([11, 10, 40, 41, 42, 56, 60, 50].some((p) => prefix === p)) {
    return "3–4 working days"
  }
  return "5–7 working days"
}
