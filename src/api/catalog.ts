import { getBackendClient } from "./backendClient"
import { requireAdmin } from "./auth"
import { isSafeImageUrl } from "./safety"
import { normalizePosters } from "./models"
import {
  backendToPoster,
  desiredVariants,
  isBackendId,
  posterToBackendProduct,
  type BackendProduct,
} from "./productMapper"
import { releaseStagedImage, takeStagedImage } from "./imageStaging"
import { priceFor, type Poster } from "../data/shop"

/**
 * Catalog repository: the only place that knows how posters map onto the
 * backend's product / variant / image endpoints.
 *
 *  GET    /api/product?expand=true&limit=&offset=  public list (active only, with images + variants)
 *  GET    /api/admin?type=product&expand=true      admin list (incl. drafts)
 *  POST   /api/product                 multipart `product` JSON
 *  PUT    /api/product                 JSON body, id in `productId`
 *  DELETE /api/product?productId=
 *  /api/product/variant, /api/product/image   see backend controllers
 */

const PAGE_SIZE = 100
const DEFAULT_STOCK = 100

type Client = ReturnType<typeof getBackendClient>

async function call<T>(client: Client, path: string, init: RequestInit, failure: string): Promise<T> {
  const res = await client.request<T>(path, init)
  if (!res.success) throw new Error(res.message ? `${failure} (${res.message})` : failure)
  return res.data as T
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})
const q = (params: Record<string, string>) => "?" + new URLSearchParams(params).toString()

async function listProducts(client: Client, base: string): Promise<BackendProduct[]> {
  const all: BackendProduct[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await call<BackendProduct[]>(client, `${base}&limit=${PAGE_SIZE}&offset=${offset}`, {}, "Could not load products.")
    if (!Array.isArray(page)) break
    all.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return all
}

const idOf = (p: BackendProduct) => String(p.id ?? p.productId ?? "")

/** Public storefront catalog (active products only). Returns null when the backend is unreachable. */
export async function loadPosters(): Promise<Poster[] | null> {
  try {
    const client = getBackendClient()
    const products = await listProducts(client, "/api/product?expand=true")
    return normalizePosters(products.map(backendToPoster))
  } catch (error) {
    console.error("Failed to load posters:", error)
    return null
  }
}

/** Admin catalog including drafts. Throws on failure so the UI can show it. */
export async function loadAdminPosters(): Promise<Poster[]> {
  await requireAdmin()
  const client = getBackendClient()
  const products = await listProducts(client, "/api/admin?type=product&expand=true")
  const posters = products.map(backendToPoster)
  const valid = normalizePosters(posters)
  if (valid.length !== posters.length)
    throw new Error("Catalog contains invalid records (missing image or sizes). Repair them before publishing.")
  return valid
}

// ─── Writes ──────────────────────────────────────────────────────────────────

async function createProduct(client: Client, poster: Poster): Promise<BackendProduct> {
  const form = new FormData()
  form.append("product", JSON.stringify(posterToBackendProduct(poster, DEFAULT_STOCK)))
  return call<BackendProduct>(client, "/api/product", { method: "POST", body: form }, `Could not create "${poster.title}".`)
}

async function syncVariants(client: Client, poster: Poster, productId: string, current: BackendProduct["variants"]) {
  const existing = new Map((current ?? []).map((v) => [v.label, v]))
  for (const v of desiredVariants(poster, priceFor)) {
    const have = existing.get(v.label)
    if (!have) {
      await call(client, "/api/product/variant", json("POST", { productId, ...v, stockQuantity: DEFAULT_STOCK }), `Could not add size ${v.label}.`)
    } else if (Math.round(have.price) !== v.price || (have.sortOrder ?? 0) !== v.sortOrder || have.active === false) {
      await call(client, "/api/product/variant" + q({ variantId: have.variantId }), json("PUT", { price: v.price, sortOrder: v.sortOrder, isActive: true }), `Could not update size ${v.label}.`)
    }
    existing.delete(v.label)
  }
  for (const stale of existing.values())
    await call(client, "/api/product/variant" + q({ variantId: stale.variantId }), json("DELETE"), `Could not remove size ${stale.label}.`)
}

async function syncImages(client: Client, poster: Poster, productId: string, current: BackendProduct["images"]) {
  const wanted = [poster.image, ...(poster.carouselImages ?? [])].filter((u, i, a) => u && a.indexOf(u) === i)
  const have = new Map((current ?? []).map((i) => [i.imageUrl ?? "", i]))
  const resolved: { id?: string; url: string }[] = []

  for (const url of wanted) {
    const hit = have.get(url)
    if (hit) {
      resolved.push({ id: hit.id, url })
      have.delete(url)
      continue
    }
    const form = new FormData()
    const file = takeStagedImage(url)
    if (file) form.append("image", file)
    else if (!isSafeImageUrl(url) || url.startsWith("/")) throw new Error("Re-select the artwork image before saving.")
    else form.append("imageUrl", url)
    const saved = await call<{ id: string; imageUrl: string }>(client, "/api/product/image" + q({ productId }), { method: "POST", body: form }, "Image upload failed.")
    if (!saved?.id || !isSafeImageUrl(saved.imageUrl) || saved.imageUrl.startsWith("/staged-upload/"))
      throw new Error("Image upload did not return a saved image. Please retry.")
    resolved.push({ id: saved.id, url: saved.imageUrl })
  }
  for (const stale of have.values())
    if (stale.id) await call(client, "/api/product/image" + q({ productId, imageId: stale.id }), json("DELETE"), "Could not remove an image.")

  const primary = resolved[0]
  const primaryNow = (current ?? []).find((i) => i.primary)
  if (primary?.id && primaryNow?.id !== primary.id)
    await call(client, "/api/product/image" + q({ productId, imageId: primary.id, primary: "true" }), json("PUT"), "Could not set the main image.")
}

async function syncTags(client: Client, poster: Poster, productId: string, current: BackendProduct["productTags"]) {
  const wanted = [...new Set((poster.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))]
  if (Array.isArray(current)) {
    const have = new Set(current.map((t) => (t.name || t.slug || "").toLowerCase()))
    if (have.size === wanted.length && wanted.every((t) => have.has(t))) return
  }
  // Backend filters (?tag=) and /api/tag read product_tags, not the attributes JSON.
  await call(client, "/api/tag" + q({ productId }), json("POST", { tags: wanted }), `Could not save tags for "${poster.title}".`)
}

async function upsertPoster(client: Client, poster: Poster, existing?: BackendProduct) {
  let productId: string
  let current = existing
  if (existing) {
    productId = idOf(existing)
    await call(client, "/api/product", json("PUT", posterToBackendProduct(poster, existing.stockQuantity ?? DEFAULT_STOCK, productId)), `Could not update "${poster.title}".`)
  } else {
    productId = idOf(await createProduct(client, poster))
    current = { id: productId, variants: [], images: [] }
    try {
      // Creation always publishes; apply draft state right away.
      if (poster.status === "draft")
        await call(client, "/api/product", json("PUT", posterToBackendProduct(poster, DEFAULT_STOCK, productId)), `Could not save "${poster.title}".`)
      await syncVariants(client, poster, productId, current.variants)
      await syncImages(client, poster, productId, current.images)
    } catch (error) {
      // Don't leave a half-built product (no sizes / image) on the storefront.
      await client.request("/api/product" + q({ productId }), json("DELETE")).catch(() => undefined)
      throw error
    }
    await syncTags(client, poster, productId, undefined)
    return
  }
  await syncVariants(client, poster, productId, current?.variants)
  await syncImages(client, poster, productId, current?.images)
  await syncTags(client, poster, productId, existing?.productTags)
}

export type SyncOptions = {
  /** Delete backend products absent from `posters`. Only the admin catalog editor should set this. */
  prune?: boolean
}

/**
 * Make the backend match `posters`. Posters whose id is a backend UUID are
 * updated; anything else (e.g. "poster-<uuid>" from the editor) is created.
 */
export async function syncCatalog(posters: Poster[], { prune = false }: SyncOptions = {}): Promise<void> {
  await requireAdmin()
  const client = getBackendClient()
  const existing = new Map(
    (await listProducts(client, "/api/admin?type=product&expand=true")).map((p) => [idOf(p), p]),
  )

  // Save everything first and keep going on failure so one bad poster
  // doesn't block the rest; report all failures together.
  const failures: string[] = []
  for (const poster of posters) {
    try {
      await upsertPoster(client, poster, isBackendId(poster.id) ? existing.get(poster.id) : undefined)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `Could not save "${poster.title}".`)
    }
  }
  if (failures.length) throw new Error(failures.join(" "))

  // Deletions run only after every save succeeded, so a failed sync never removes products.
  if (prune) {
    const keep = new Set(posters.map((p) => p.id))
    for (const id of existing.keys())
      if (!keep.has(id)) await call(client, "/api/product" + q({ productId: id }), json("DELETE"), "Could not delete a product.")
  }
  for (const poster of posters)
    for (const url of [poster.image, ...(poster.carouselImages ?? [])])
      releaseStagedImage(url)
}
