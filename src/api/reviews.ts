import { getSupabase, supabase } from "./client"
import { currentMember } from "./customerAuth"
import { requireAdmin } from "./auth"
import { validateRasterFile } from "./images"
export const REVIEW_BUCKET = "review-photos"
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

async function mapRows(
  rows: Record<string, unknown>[],
): Promise<PhotoReview[]> {
  const client = getSupabase()
  return Promise.all(
    rows.map(async (r) => {
      const { data } = await client.storage
        .from(REVIEW_BUCKET)
        .createSignedUrl(String(r.photo_path), 3600)
      return {
        id: String(r.id),
        name: String(r.display_name),
        city: String(r.city || ""),
        rating: Number(r.rating),
        text: String(r.body),
        photo: data?.signedUrl || "",
        approved: !!r.approved,
      }
    }),
  )
}
export async function loadPhotoReviews(): Promise<PhotoReview[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("ws_reviews")
    .select("id,display_name,city,rating,body,photo_path,approved")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error)
    throw new Error(
      "Customer photos could not be loaded. Please try again later.",
    )
  return mapRows(data || [])
}

/** Renew one-hour photo links before expiry and after returning to a hidden tab. */
export function subscribePhotoReviews(
  onRows: (rows: PhotoReview[]) => void,
  onError: (error: Error) => void,
  load: () => Promise<PhotoReview[]> = loadPhotoReviews,
) {
  if (!supabase && load === loadPhotoReviews) {
    onRows([])
    return () => {}
  }
  let active = true, busy = false
  async function refresh() {
    if (!active || busy || document.hidden) return
    busy = true
    try {
      const rows = await load()
      if (active) onRows(rows)
    } catch (error) {
      if (active) onError(error instanceof Error ? error : new Error("Customer photos could not be loaded. Please try again later."))
    } finally {
      busy = false
    }
  }
  const onVisibility = () => { if (!document.hidden) void refresh() }
  void refresh()
  const timer = setInterval(() => { void refresh() }, 45 * 60 * 1000)
  document.addEventListener("visibilitychange", onVisibility)
  return () => {
    active = false
    clearInterval(timer)
    document.removeEventListener("visibilitychange", onVisibility)
  }
}

export async function submitPhotoReview(input: ReviewInput, file: File) {
  validateReview(input)
  await validateReviewPhoto(file)
  const member = await currentMember()
  if (!member) throw new Error("Sign in to submit your review.")
  const client = getSupabase(),
    extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp"
  const path = member.id + "/" + crypto.randomUUID() + "." + extension
  const { error: uploadError } = await client.storage
    .from(REVIEW_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error("Photo upload failed. Please try again.")
  const { error } = await client
    .from("ws_reviews")
    .insert({
      user_id: member.id,
      display_name: input.name.trim(),
      city: input.city.trim(),
      rating: input.rating,
      body: input.text.trim(),
      photo_path: path,
    })
  if (error) {
    await client.storage.from(REVIEW_BUCKET).remove([path])
    throw new Error(
      "Your review could not be submitted. Please try later; up to three reviews per day are allowed.",
    )
  }
}
export async function loadModerationReviews() {
  await requireAdmin()
  const { data, error } = await getSupabase()
    .from("ws_reviews")
    .select("id,display_name,city,rating,body,photo_path,approved")
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw new Error("Review moderation is unavailable.")
  return mapRows(data || [])
}
export async function approveReview(id: string) {
  await requireAdmin()
  const { error } = await getSupabase()
    .from("ws_reviews")
    .update({ approved: true })
    .eq("id", id)
  if (error) throw new Error("Review approval failed.")
}
export async function removeReview(id: string) {
  await requireAdmin()
  const client = getSupabase()
  const { data, error: lookup } = await client
    .from("ws_reviews")
    .select("photo_path")
    .eq("id", id)
    .single()
  if (lookup) throw new Error("Review could not be found.")
  const { error: photoError } = await client.storage
    .from(REVIEW_BUCKET)
    .remove([data.photo_path])
  if (photoError) throw new Error("Review photo removal failed. Please retry.")
  const { error } = await client.from("ws_reviews").delete().eq("id", id)
  if (error)
    throw new Error(
      "The photo was removed but the review could not be removed. Please retry.",
    )
}
