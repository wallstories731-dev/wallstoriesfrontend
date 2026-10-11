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

export const featuredConfig = { posterId: "dune-shadow" }
export const featuredPosterId = featuredConfig.posterId

export function instagramDmUrl() {
  return `https://ig.me/m/${shop.instagramUsername}`
}

export type SizeKey = "A4" | "A3" | "A2" | "12×18" | "18×24"

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

const defaultCategories = [
  "All",
  "Movies",
  "Music",
  "Nature",
  "Botanical",
  "Abstract",
  "Typography",
  "Vintage",
  "Sports",
  "Anime",
]

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
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&h=1200&fit=crop&auto=format&q=80`

const defaultPosters: Poster[] = [
  {
    id: "neon-tokyo",
    code: "WS-MOV-01",
    title: "Neon Tokyo",
    category: "Movies",
    basePrice: 499,
    sizes: ["A4", "A3", "A2", "12×18", "18×24"],
    image: img("1601042879364-f3947d3f9c16"),
    alt: "Cars on a rain-slick road between high-rise buildings lit by neon signs at night",
    description:
      "Rain on asphalt, signage bleeding into the puddles. Printed on 300 GSM matte art paper so the blacks stay deep and the neon stays soft.",
    added: 12,
    badge: "bestseller",
  },
  {
    id: "crossing",
    code: "WS-MOV-02",
    title: "The Crossing",
    category: "Movies",
    basePrice: 449,
    sizes: ["A4", "A3", "12×18", "18×24"],
    image: img("1541702467897-41915a07d3a7"),
    alt: "A person in a grey raincoat crossing a neon-lit intersection beside an orange car",
    description:
      "One figure, one intersection, one held breath. A quiet cinematic frame for the wall above a desk.",
    added: 11,
  },
  {
    id: "golden-fields",
    code: "WS-NAT-01",
    title: "Golden Fields",
    category: "Nature",
    basePrice: 469,
    sizes: ["A4", "A3", "A2", "18×24"],
    image: img("1613854680145-f04b67cd7fa1"),
    alt: "A wide brown desert field stretching under a clear blue sky",
    description:
      "Sun-bleached earth meeting an unbroken sky. Warm enough to sit beside cane furniture, calm enough for a bedroom.",
    added: 10,
  },
  {
    id: "dune-shadow",
    code: "WS-NAT-02",
    title: "Dune Shadow",
    category: "Nature",
    basePrice: 519,
    sizes: ["A4", "A3", "A2", "12×18", "18×24"],
    image: img("1750859876218-7c66b60afa02"),
    alt: "Curving sand dunes cast in alternating shadow and light",
    description:
      "Light doing geometry on sand. The tonal range holds up beautifully at A2 — this one is worth going large on.",
    added: 9,
    badge: "few-left",
  },
  {
    id: "fog-pines",
    code: "WS-NAT-03",
    title: "Fog & Pines",
    category: "Nature",
    basePrice: 429,
    sizes: ["A4", "A3", "12×18"],
    image: img("1529333110658-26b4cf759641"),
    alt: "Green pine trees surrounded by thick morning fog",
    description:
      "Almost monochrome, almost silent. Pairs well with the sage and cream rooms it usually ends up in.",
    added: 8,
  },
  {
    id: "first-press",
    code: "WS-MUS-01",
    title: "First Press",
    category: "Music",
    basePrice: 439,
    sizes: ["A4", "A3", "A2", "12×18"],
    image: img("1485726696757-76885c99f0f5"),
    alt: "A black and blue turntable resting on a brown wooden side table",
    description:
      "For the people who still flip the record halfway through dinner. Deep blues against warm wood.",
    added: 7,
  },
  {
    id: "side-b",
    code: "WS-MUS-02",
    title: "Side B",
    category: "Music",
    basePrice: 459,
    sizes: ["A4", "A3", "18×24"],
    image: img("1526394931762-90052e97b376"),
    alt: "A black turntable photographed from above on a brown wooden table",
    description:
      "A top-down study of a tonearm mid-track. Reads as a graphic print from across the room.",
    added: 6,
  },
  {
    id: "soft-machine",
    code: "WS-ABS-01",
    title: "Soft Machine",
    category: "Abstract",
    basePrice: 489,
    sizes: ["A4", "A3", "A2", "18×24"],
    image: img("1738937444519-f0a7084c955e"),
    alt: "A close-up of stacked orange and yellow curved forms",
    description:
      "Molten oranges folding into each other. The one print in the catalogue that changes colour with the light in the room.",
    added: 5,
  },
  {
    id: "blue-torsion",
    code: "WS-ABS-02",
    title: "Blue Torsion",
    category: "Abstract",
    basePrice: 479,
    badge: "new" as const,
    sizes: ["A4", "A3", "A2", "12×18", "18×24"],
    image: img("1774360502057-a934d7d0ce60"),
    alt: "Blue geometric shapes twisting into an abstract woven pattern",
    description:
      "Hard geometry that somehow reads as fabric. A cool counterweight if the rest of your wall runs warm.",
    added: 4,
  },
  {
    id: "quiet-planet",
    code: "WS-TYP-01",
    title: "Quiet Planet",
    category: "Typography",
    basePrice: 409,
    sizes: ["A4", "A3", "12×18"],
    image: img("1652074847108-0b4294408ca1"),
    alt: "A black and white grainy rendering of a sphere against a dark field",
    description:
      "A single grain-heavy sphere with a hairline caption set below it. Understated, and the easiest thing here to hang anywhere.",
    added: 3,
  },
  {
    id: "lubitel",
    code: "WS-VIN-01",
    title: "Lubitel 2",
    category: "Vintage",
    basePrice: 449,
    sizes: ["A4", "A3", "A2", "12×18"],
    image: img("1759995929231-9380d247b004"),
    alt: "A vintage Lubitel 2 twin lens reflex camera photographed against a plain backdrop",
    description:
      "A twin-lens reflex, shot the way it deserves. Every dial and screw is sharp right up to A2.",
    added: 2,
  },
  {
    id: "court-light",
    code: "WS-SPR-01",
    title: "Court Light",
    category: "Sports",
    basePrice: 439,
    sizes: ["A4", "A3", "18×24"],
    image: img("1595795279832-13f0df36fbb9"),
    alt: "A brown basketball resting on a grey concrete outdoor court floor",
    description:
      "The last ball on the court after everyone has gone home. Grainy, warm, and quieter than most sports prints.",
    added: 1,
  },
  {
    id: "shelf-life",
    code: "WS-VIN-02",
    title: "Shelf Life",
    category: "Vintage",
    basePrice: 419,
    sizes: ["A4", "A3", "12×18"],
    image: img("1784316395297-c1f0b835242b"),
    alt: "Two vintage cameras displayed side by side on a dark wooden shelf",
    description:
      "Two old bodies on a dark shelf, lit like a still life. Deep shadows — best on the matte stock.",
    added: 0,
  },
  {
    id: "monstera-study",
    code: "WS-BOT-01",
    title: "Monstera Study",
    category: "Botanical",
    basePrice: 399,
    sizes: ["A4", "A3", "12×18"],
    image: img("1533038590840-1cde6e668a91"),
    alt: "A single green leaf photographed against a pale background",
    description:
      "One leaf, edge-lit, nothing else. The print people buy in pairs and hang either side of a doorway.",
    added: 13,
    badge: "new",
  },
]

/**
 * A lightweight version of a poster image for sending over chat. Instagram
 * recompresses anything you attach, so shipping the full-size file only makes
 * the share slower — a ~480px preview is enough for the seller to identify the
 * print, and the code in the filename carries the rest.
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

// Curated Unsplash room/interior images for the "on your wall" gallery slot
const ROOM_PHOTO_IDS = [
  "1586023492125-27272f5d4f68",
  "1560372595814-69eb36bfb8db",
  "1556912167-06380670ea84",
  "1615529328331-f8917597711f",
  "1534349762230-e0cadf78f5da",
  "1524758631624-e2822132143",
  "1618220048045-10a6dbdf4e01",
]

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
