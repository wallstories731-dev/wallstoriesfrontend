import type { Poster, SizeKey } from "../data/shop"
import { SIZE_KEYS } from "../data/shop"
import { asRecord, stringList } from "./models"

/**
 * Pure translation between backend product DTOs and the storefront `Poster`.
 * Every field that has no backend column lives in `Product.attributes`
 * (a JSON string), so adding a new poster field only touches this file.
 */

export type BackendProduct = {
  id?: string
  productId?: string
  name?: string
  description?: string
  category?: string
  price?: number
  stockQuantity?: number
  active?: boolean
  attributes?: string | null
  /** Tags attached through /api/tag (the product_tags table). */
  productTags?: { name?: string; slug?: string }[] | null
  primaryImageUrl?: string | null
  images?: { id?: string; imageUrl?: string; primary?: boolean }[] | null
  variants?: BackendVariant[] | null
  createdAt?: string | number | null
}

export type BackendVariant = {
  variantId: string
  productId?: string
  label: string
  price: number
  stockQuantity?: number
  active?: boolean
  sortOrder?: number
}

/** Poster fields persisted inside `Product.attributes`. */
export type PosterAttributes = Pick<Poster, "code" | "alt" | "badge" | "orientation" | "tags" | "featured"> & {
  /** Per-size MRP (strike-through price), keyed by size. */
  mrp?: Partial<Record<SizeKey, number>>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isBackendId = (id: unknown): id is string => typeof id === "string" && UUID.test(id)

export function parseAttributes(raw: unknown): Partial<PosterAttributes> {
  if (typeof raw !== "string" || !raw.trim()) return {}
  try {
    const row = asRecord(JSON.parse(raw))
    const mrp: PosterAttributes["mrp"] = {}
    for (const [k, v] of Object.entries(asRecord(row.mrp)))
      if ((SIZE_KEYS as string[]).includes(k) && typeof v === "number" && v > 0) mrp[k as SizeKey] = v
    return {
      code: typeof row.code === "string" ? row.code : undefined,
      alt: typeof row.alt === "string" ? row.alt : undefined,
      badge: row.badge === "new" || row.badge === "bestseller" || row.badge === "few-left" ? row.badge : undefined,
      orientation: row.orientation === "square" ? "square" : "portrait",
      tags: stringList(row.tags, [], 20),
      featured: row.featured === true,
      mrp,
    }
  } catch {
    return {}
  }
}

export function serializeAttributes(poster: Poster): string {
  const mrp: PosterAttributes["mrp"] = {}
  for (const size of poster.sizes) {
    const entry = poster.customPrices?.[size]
    if (entry && entry.mrp > entry.price) mrp[size] = entry.mrp
  }
  const attrs: PosterAttributes = {
    code: poster.code,
    alt: poster.alt,
    badge: poster.badge,
    orientation: poster.orientation,
    tags: poster.tags,
    featured: poster.featured,
    mrp,
  }
  return JSON.stringify(attrs)
}

export function backendToPoster(product: BackendProduct): Poster {
  const id = String(product.id ?? product.productId ?? "")
  const attrs = parseAttributes(product.attributes)
  const variants = [...(product.variants ?? [])]
    .filter((v) => v.active !== false && (SIZE_KEYS as string[]).includes(v.label))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const sizes = variants.length ? variants.map((v) => v.label as SizeKey) : (["A4"] as SizeKey[])
  const customPrices: NonNullable<Poster["customPrices"]> = {}
  const variantIds: NonNullable<Poster["variantIds"]> = {}
  for (const v of variants) {
    const size = v.label as SizeKey
    const price = Math.round(v.price)
    customPrices[size] = { price, mrp: Math.max(price, attrs.mrp?.[size] ?? price) }
    variantIds[size] = v.variantId
  }

  const images = product.images ?? []
  const primary = product.primaryImageUrl || images.find((i) => i.primary)?.imageUrl || images[0]?.imageUrl || ""
  const name = String(product.name ?? "")
  const created = product.createdAt ? new Date(product.createdAt).getTime() : 0
  const base = customPrices.A4?.price ?? customPrices[sizes[0]]?.price ?? Math.round(product.price ?? 0)

  return {
    id,
    code: attrs.code || id.slice(0, 8).toUpperCase(),
    title: name,
    category: String(product.category ?? ""),
    basePrice: base,
    sizes,
    image: primary,
    carouselImages: images.map((i) => i.imageUrl ?? "").filter((u) => u && u !== primary),
    alt: attrs.alt || name,
    description: String(product.description ?? ""),
    added: Number.isFinite(created) ? created : 0,
    badge: attrs.badge,
    orientation: attrs.orientation ?? "portrait",
    status: product.active === false ? "draft" : "active",
    tags: attrs.tags ?? [],
    featured: attrs.featured ?? false,
    customPrices,
    variantIds,
  }
}

/** Body for POST/PUT /api/product. Only fields known to the backend `Product` class (it rejects unknown ones). */
export function posterToBackendProduct(poster: Poster, stockQuantity: number, productId?: string) {
  const a4 = poster.customPrices?.[poster.sizes[0]]?.price ?? poster.basePrice
  return {
    ...(productId ? { productId } : {}),
    name: poster.title,
    description: poster.description,
    category: poster.category,
    ingredients: "",
    price: a4,
    stockQuantity,
    active: poster.status !== "draft",
    attributes: serializeAttributes(poster),
  }
}

/** The variant rows a poster should have, in display order. */
export function desiredVariants(poster: Poster, priceOf: (poster: Poster, size: SizeKey) => number) {
  return poster.sizes.map((size, sortOrder) => ({
    label: size,
    price: poster.customPrices?.[size]?.price ?? priceOf(poster, size),
    sortOrder,
  }))
}
