import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useCustomerAuth } from "../context/CustomerAuthContext"
import ArtworkImage from "./ArtworkImage"
import {
  loadProductReviews,
  submitProductReview,
  type BackendReview,
} from "../api/reviews"

type Props = {
  productId: string
  productTitle: string
}

/**
 * Per-product reviews block for the product detail page.
 *
 * - Lists existing reviews (with their wall photo, if any).
 * - Shows a "Write a review" button.
 *   - Signed-out customers are routed to /account?returnTo=<current> so they
 *     land back on the product page after signing in.
 *   - Signed-in customers get an inline form (rating + comment). Photo
 *     submissions keep living in #photo-reviews because that flow already
 *     handles the multipart upload.
 */
export default function ProductReviews({ productId, productTitle }: Props) {
  const { member, loading: authLoading } = useCustomerAuth()
  const navigate = useNavigate()

  const [reviews, setReviews] = useState<BackendReview[]>([])
  const [summary, setSummary] = useState<{ avgRating: number; totalReviews: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [thanks, setThanks] = useState("")

  const formHeadingRef = useRef<HTMLHeadingElement>(null)

  async function refresh() {
    setLoading(true)
    setLoadError("")
    try {
      const feed = await loadProductReviews(productId)
      setReviews(feed.reviews)
      setSummary(feed.summary)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Reviews could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setReviews([])
    setSummary(null)
    setFormOpen(false)
    setThanks("")
    setError("")
    loadProductReviews(productId)
      .then((feed) => {
        if (!active) return
        setReviews(feed.reviews)
        setSummary(feed.summary)
      })
      .catch((e) => {
        if (!active) return
        setLoadError(e instanceof Error ? e.message : "Reviews could not be loaded.")
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [productId])

  // Autofocus the form heading once the inline form opens, so the user
  // sees the context switch clearly.
  useEffect(() => {
    if (formOpen) formHeadingRef.current?.focus()
  }, [formOpen])

  function requestReview() {
    setError("")
    setThanks("")
    if (authLoading) return // still deciding; leave button as-is
    if (!member) {
      const returnTo = window.location.pathname + window.location.search + window.location.hash
      navigate(`/account?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }
    setFormOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const trimmed = comment.trim()
    if (trimmed.length < 10 || trimmed.length > 1200) {
      setError("Write a review of 10–1200 characters.")
      return
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Choose a rating from 1 to 5.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await submitProductReview(productId, rating, trimmed)
      setThanks("Thanks for the review! It's live.")
      setComment("")
      setRating(5)
      setFormOpen(false)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your review could not be submitted.")
    } finally {
      setBusy(false)
    }
  }

  const avg = summary?.avgRating ?? 0
  const count = summary?.totalReviews ?? reviews.length

  return (
    <section aria-labelledby="product-reviews-title" className="mt-10 border-t border-hairline pt-8">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-magenta uppercase">Customer reviews</p>
          <h2
            id="product-reviews-title"
            className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[26px]"
          >
            What people say about {productTitle}
          </h2>
          {count > 0 && (
            <p className="mt-1 text-[12px] text-ink-soft">
              <span aria-label={`${avg.toFixed(1)} out of 5 stars`} className="text-magenta">
                {"★".repeat(Math.round(avg))}
                {"☆".repeat(Math.max(0, 5 - Math.round(avg)))}
              </span>{" "}
              {avg.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={requestReview}
          disabled={busy || authLoading}
          className="shrink-0 rounded-full border border-magenta bg-yellow px-4 py-2.5 text-[12px] font-semibold text-ink shadow-[2px_2px_0_var(--color-magenta)] transition hover:bg-magenta hover:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta disabled:opacity-60"
        >
          {member ? "Write a review ✍️" : "Sign in to write a review →"}
        </button>
      </header>

      {thanks && (
        <p role="status" className="mb-4 rounded-[10px] border border-success/30 bg-success/10 px-4 py-3 text-[12px] text-success">
          {thanks}
        </p>
      )}

      {formOpen && member && (
        <form
          onSubmit={submit}
          className="mb-6 rounded-[14px] border border-purple bg-ground-soft p-5"
        >
          <fieldset disabled={busy} className="contents">
            <h3
              ref={formHeadingRef}
              tabIndex={-1}
              className="text-[15px] font-semibold text-ink focus:outline-none"
            >
              Share your thoughts
            </h3>
            <p className="mt-1 text-[12px] text-ink-soft">
              Posting as <strong className="text-ink">{member.name}</strong>. Keep it kind and honest.
            </p>
            <fieldset className="mt-4">
              <legend className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
                Your rating
              </legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    aria-pressed={rating === n}
                    onClick={() => setRating(n)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition ${
                      n <= rating ? "text-magenta" : "text-ink/25 hover:text-ink/40"
                    }`}
                  >
                    {n <= rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-[12px] font-semibold text-ink">
              Your review
              <textarea
                required
                minLength={10}
                maxLength={1200}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How does this print live on your wall?"
                className="mt-2 w-full resize-y rounded-[10px] border border-hairline bg-ground px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-soft/60 focus:border-magenta focus:outline-none"
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 rounded-[10px] border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-magenta px-5 py-2.5 text-[12px] font-semibold text-ground shadow-[0_8px_18px_-10px_rgba(229,21,127,0.9)] transition hover:bg-magenta-deep disabled:opacity-60"
              >
                {busy ? "Posting…" : "Post review"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  setError("")
                }}
                disabled={busy}
                className="rounded-full border border-hairline px-5 py-2.5 text-[12px] text-ink-soft transition hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {loading ? (
        <p role="status" className="text-[12px] text-ink-soft">
          Loading reviews…
        </p>
      ) : loadError ? (
        <p role="status" className="text-[12px] text-danger">
          {loadError}
        </p>
      ) : reviews.length === 0 ? (
        <p className="text-[12px] text-ink-soft">
          No reviews yet. Be the first to share your thoughts.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.reviewId} review={r} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewCard({ review }: { review: BackendReview }) {
  const name = displayName(review)
  const when = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null
  return (
    <li className="rounded-[12px] border border-hairline bg-ground p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-ink">{name}</p>
          <p className="text-[11px] text-ink-soft">
            {[review.city, when].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className="text-magenta tracking-[2px]"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {"★".repeat(review.rating)}
          <span className="text-ink/20">{"★".repeat(5 - review.rating)}</span>
        </span>
      </div>
      {review.photoUrl && (
        <div className="mt-3 overflow-hidden rounded-[10px] border border-hairline">
          <ArtworkImage
            src={review.photoUrl}
            alt={`Wall photo shared by ${name}`}
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        </div>
      )}
      {review.comment && (
        <blockquote className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          “{review.comment}”
        </blockquote>
      )}
    </li>
  )
}

function displayName(review: BackendReview): string {
  const email = (review.userEmail || "").trim()
  if (!email) return "Customer"
  const at = email.indexOf("@")
  return at > 0 ? email.slice(0, at) : email
}
