import { getBackendClient } from "./backendClient"
import { validateRasterFile } from "./images"
import { requireAdmin } from "./auth"
export type PhotoReview = {
  id: string
  name: string
  city: string
  rating: number
  text: string
  photo: string
  sample?: boolean
  approved?: boolean
}
export type ReviewInput = {
  name: string
  city: string
  rating: number
  text: string
  consent: boolean
}
export function validateReview(input: ReviewInput) {
  if (!input.name.trim() || input.name.trim().length > 100)
    throw new Error("Enter a name up to 100 characters.")
  if (input.city.trim().length > 100)
    throw new Error("City must be under 100 characters.")
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    throw new Error("Choose a rating from 1 to 5.")
  if (input.text.trim().length < 10 || input.text.trim().length > 1200)
    throw new Error("Write a review of 10–1200 characters.")
  if (!input.consent)
    throw new Error("Please agree to publish your photo and review.")
}
export const validateReviewPhoto = validateRasterFile

/**
 * Reviews live in the backend (/api/review): rating + comment per product,
 * plus an optional wall photo stored via the shared image repository
 * (R2/MinIO) and surfaced as `photoUrl` on every row. The photo-review
 * gallery and admin moderation view both read from that single source.
 */
export type BackendReview = {
  reviewId: string
  productId: string
  rating: number
  comment: string | null
  userEmail?: string
  productName?: string
  photoUrl?: string | null
  city?: string | null
  createdAt?: string | number | null
}

export async function loadFeaturedReviews(limit = 12): Promise<BackendReview[]> {
  const res = await getBackendClient().request<{ reviews: BackendReview[] }>(
    `/api/review?featured=true&limit=${limit}`,
  )
  if (!res.success) throw new Error("Reviews could not be loaded. Please try again later.")
  return res.data?.reviews ?? []
}

/** Text-only product review (used from the product detail page). */
export async function submitProductReview(productId: string, rating: number, comment: string) {
  const res = await getBackendClient().request("/api/review", {
    method: "POST",
    body: JSON.stringify({ productId, rating, comment: comment.trim() }),
  })
  if (!res.success) throw new Error(res.message || "Your review could not be submitted.")
}

/**
 * Per-product review feed used by the product detail page.
 * Returns the backend rows alongside the aggregate `summary` (average + count)
 * that `/api/review?productId=` already emits, so the page can render both
 * the rating badge and the list from a single round-trip.
 */
export type ProductReviewFeed = {
  reviews: BackendReview[]
  summary: { avgRating: number; totalReviews: number } | null
}

export async function loadProductReviews(
  productId: string,
  limit = 20,
): Promise<ProductReviewFeed> {
  const res = await getBackendClient().request<{
    reviews: BackendReview[]
    summary?: { avgRating: number; totalReviews: number } | null
  }>(`/api/review?productId=${encodeURIComponent(productId)}&limit=${limit}`)
  if (!res.success) throw new Error(res.message || "Reviews could not be loaded.")
  return {
    reviews: res.data?.reviews ?? [],
    summary: res.data?.summary ?? null,
  }
}

/** Pretty display name — prefers "Name" over "foo@bar.com". */
function displayName(review: BackendReview): string {
  const email = (review.userEmail || "").trim()
  if (!email) return "Customer"
  const at = email.indexOf("@")
  return at > 0 ? email.slice(0, at) : email
}

function toPhotoReview(row: BackendReview): PhotoReview {
  return {
    id: row.reviewId,
    name: displayName(row),
    city: row.city || row.productName || "",
    rating: row.rating,
    text: row.comment || "",
    photo: row.photoUrl || "",
    approved: true,
  }
}

export async function loadPhotoReviews(limit = 24): Promise<PhotoReview[]> {
  const res = await getBackendClient().request<{ reviews: BackendReview[] }>(
    `/api/review?photos=true&limit=${limit}`,
  )
  if (!res.success) throw new Error(res.message || "Customer photos could not be loaded.")
  // Defensive filter: backend promises photo_url is present, but drop
  // anything unexpected so the gallery never renders a broken tile.
  return (res.data?.reviews ?? []).filter((r) => !!r.photoUrl).map(toPhotoReview)
}

export function subscribePhotoReviews(
  onRows: (rows: PhotoReview[]) => void,
  _onError: (error: Error) => void,
  load: () => Promise<PhotoReview[]> = loadPhotoReviews,
) {
  let active = true
  load()
    .then((rows) => active && onRows(rows))
    .catch((e) => active && _onError(e instanceof Error ? e : new Error("Customer photos could not be loaded.")))
  return () => {
    active = false
  }
}

/**
 * The "Share your wall" form submits text + photo as a single multipart
 * POST. The customer picks a product-less testimonial, so `productId`
 * comes from an attribute on the review input (the storefront passes a
 * site-wide fallback — e.g. the first catalog product). If a product
 * isn't available we throw rather than send a half-formed review.
 */
export async function submitPhotoReview(
  input: ReviewInput & { productId?: string },
  file: File,
) {
  validateReview(input)
  await validateReviewPhoto(file)
  if (!input.productId) {
    throw new Error("Choose a poster to pair with your photo review.")
  }
  const form = new FormData()
  form.append("productId", input.productId)
  form.append("rating", String(input.rating))
  form.append("comment", input.text.trim())
  if (input.city.trim()) form.append("city", input.city.trim())
  form.append("photo", file, file.name)
  // The client auto-skips Content-Type for FormData so the browser can
  // set the correct multipart boundary.
  const res = await getBackendClient().request<BackendReview>("/api/review", { method: "POST", body: form })
  if (!res.success) throw new Error(res.message || "Your review could not be submitted.")
  if (!res.data?.reviewId || !res.data.photoUrl)
    throw new Error("The server did not return the saved photo review. Please reload before retrying.")
  return toPhotoReview(res.data)
}
export async function loadModerationReviews(): Promise<PhotoReview[]> {
  await requireAdmin()
  const res = await getBackendClient().request<{ reviews: BackendReview[] }>(
    "/api/review?all=true&limit=200",
  )
  if (!res.success) throw new Error(res.message || "Reviews could not be loaded.")
  return (res.data?.reviews ?? []).map((r) => ({
    id: r.reviewId,
    name: displayName(r),
    // Prefer the city the customer typed; fall back to the product name
    // so the admin can still tell what poster the review is for.
    city: r.city || r.productName || "",
    rating: r.rating,
    text: r.comment || "",
    photo: r.photoUrl || "",
    approved: true,
  }))
}
// Backend reviews are published on submit, so there is nothing to approve.
export async function approveReview(_id: string) {}
export async function removeReview(id: string) {
  await requireAdmin()
  const res = await getBackendClient().request(`/api/review?reviewId=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.success) throw new Error(res.message || "Review could not be removed.")
}
