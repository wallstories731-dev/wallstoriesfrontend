import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { REVIEWS } from "../data/reviews"
import ArtworkImage from "./ArtworkImage"
import useModal from "../hooks/useModal"
import { useCustomerAuth } from "../context/CustomerAuthContext"
import { useStore } from "../context/StoreContext"
import { accountsAvailable } from "../api/customerAuth"
import {
  subscribePhotoReviews,
  submitPhotoReview,
  validateReviewPhoto,
  type PhotoReview,
} from "../api/reviews"
const SAMPLES: PhotoReview[] = REVIEWS.filter((r) => r.wallPhoto).map((r) => ({
  id: r.id,
  name: r.name,
  city: r.city,
  rating: r.rating,
  text: r.text,
  photo: r.wallPhoto!,
  sample: true,
}))
function ReviewLightbox({
  review,
  onClose,
}: {
  review: PhotoReview
  onClose: () => void
}) {
  const ref = useModal(true, onClose)
  return (
    <div className="photo-lightbox-backdrop" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={"Photo review by " + review.name}
        className="photo-lightbox"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="photo-lightbox-close"
          onClick={onClose}
          aria-label="Close photo review"
        >
          ×
        </button>
        <ArtworkImage
          src={review.photo}
          alt={
            review.sample
              ? "Sample room inspiration"
              : "Customer wall shared by " + review.name
          }
        />
        <div>
          <p className="photo-sample">
            {review.sample
              ? "Sample photo · room inspiration"
              : "Customer photo"}
          </p>
          <h3>
            {review.name} · {review.city}
          </h3>
          <p aria-label={review.rating + " out of 5 stars"}>
            {"★".repeat(review.rating)}
          </p>
          <blockquote>{review.text}</blockquote>
        </div>
      </div>
    </div>
  )
}
export default function PhotoReviews() {
  const { member } = useCustomerAuth()
  // Reviews live against a product, so we pair every photo-only submission
  // with a product id. Prefer the hero-featured poster; fall back to the
  // first non-draft poster in the catalog so the form keeps working even
  // before an admin picks a hero.
  const { posters, featuredConfig } = useStore()
  const targetProductId =
    posters.find((p) => p.id === featuredConfig.posterId && p.status !== "draft")?.id ??
    posters.find((p) => p.status !== "draft")?.id ??
    ""
  const [reviews, setReviews] = useState<PhotoReview[]>(SAMPLES),
    [activeId, setActiveId] = useState<string | null>(null),
    [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState(""),
    [city, setCity] = useState(""),
    [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [consent, setConsent] = useState(false)
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [loadingError, setLoadingError] = useState(""),
    [toast, setToast] = useState("")
  const url = useRef(""),
    generation = useRef(0)
  const active = reviews.find((review) => review.id === activeId) || null
  useEffect(() => {
    return subscribePhotoReviews(
      (rows) => {
        const next = rows.length ? rows : SAMPLES
        setReviews(next)
        setLoadingError("")
        setActiveId((id) => next.some((row) => row.id === id) ? id : null)
      },
      (error) => setLoadingError(error.message),
    )
  }, [])
  useEffect(() => {
    if (member) setName(member.name)
  }, [member])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 3400)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(
    () => () => {
      generation.current++
      if (url.current) URL.revokeObjectURL(url.current)
    },
    [],
  )
  async function chooseFile(next: File) {
    const id = ++generation.current
    setError("")
    setFile(null)
    setPreview("")
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = ""
    try {
      await validateReviewPhoto(next)
      if (id !== generation.current) return
      url.current = URL.createObjectURL(next)
      setPreview(url.current)
      setFile(next)
    } catch (e) {
      if (id === generation.current)
        setError(e instanceof Error ? e.message : "Photo could not be opened.")
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError("")
    if (!member) {
      setToast("Please log in to submit your review.")
      return
    }
    if (!file) {
      setError("Choose a photo of your wall.")
      return
    }
    setBusy(true)
    try {
      const saved = await submitPhotoReview({ name, city, rating, text, consent, productId: targetProductId }, file)
      setReviews((prev) => [
        saved,
        ...prev.filter((review) => review.id !== saved.id && !review.sample),
      ])
      setSent(true)
      setFile(null)
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = ""
      setPreview("")
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Review could not be submitted.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      id="photo-reviews"
      className="photo-reviews-section"
      aria-labelledby="photo-reviews-title"
    >
      <header className="photo-reviews-heading">
        <div>
          <p className="reviews-kicker">Your print, out in the world</p>
          <h2 id="photo-reviews-title">Show us your wall.</h2>
          <p>Real rooms, personal stories, and a little inspiration.</p>
        </div>
        <button
          className="funk-button"
          disabled={busy}
          aria-expanded={formOpen}
          aria-controls="photo-review-form"
          onClick={() => setFormOpen(!formOpen)}
        >
          {formOpen ? "Close form" : "Share your wall"}
          <span aria-hidden="true">↗</span>
        </button>
      </header>
      {reviews[0]?.sample && (
        <p className="photo-sample">
          Sample photos and reviews shown for inspiration. Customer submissions
          appear after successful submission.
        </p>
      )}
      {loadingError && (
        <p role="status" className="photo-sample">
          {loadingError}
        </p>
      )}
      <div className="photo-review-grid">
        {reviews.map((review) => (
          <button
            key={review.id}
            className="photo-review-card"
            onClick={() => setActiveId(review.id)}
            aria-label={"View photo review by " + review.name}
          >
            <ArtworkImage
              src={review.photo}
              alt={
                review.sample
                  ? "Sample room inspiration"
                  : "Customer wall shared by " + review.name
              }
              loading="lazy"
            />
            <div>
              <span
                className="photo-review-rating"
                aria-label={review.rating + " out of 5 stars"}
              >
                {"★".repeat(review.rating)}
              </span>
              <h3>{review.name}</h3>
              <p>{review.city}</p>
              <blockquote>{review.text}</blockquote>
              <span aria-hidden="true">↗</span>
            </div>
          </button>
        ))}
      </div>
      <div
        id="photo-review-form"
        hidden={!formOpen}
        className="photo-review-form"
      >
        {sent ? (
          <div role="status">
            <h3>Thanks for sharing your wall!</h3>
            <p>Your photo review has been published.</p>
            <button
              onClick={() => {
                setSent(false)
                setText("")
                setConsent(false)
              }}
            >
              Write another review
            </button>
          </div>
        ) : (
          <>
            <h3>A photo. A few words. Your wall story.</h3>
            {!member && (
              <p className="account-notice">
                <Link to="/account?returnTo=/%23photo-reviews">
                  Sign in or create an account
                </Link>{" "}
                to submit. You can preview your photo here.
              </p>
            )}
            {!accountsAvailable && (
              <p className="photo-sample">
                Review submissions are currently unavailable.
              </p>
            )}
            <form onSubmit={submit}>
              <fieldset disabled={busy} className="contents">
              <div className="photo-form-grid">
                <label>
                  Name
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label>
                  City (optional)
                  <input
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </label>
              </div>
              <fieldset className="photo-stars">
                <legend>Your rating</legend>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={value + " star" + (value === 1 ? "" : "s")}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                    className={value <= rating ? "selected" : ""}
                  >
                    ★
                  </button>
                ))}
              </fieldset>
              <label>
                Your review
                <textarea
                  required
                  minLength={10}
                  maxLength={1200}
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What changed when your print found its place?"
                />
              </label>
              <label className="photo-upload-label">
                Wall photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void chooseFile(f)
                  }}
                />
                <small>JPEG, PNG or WebP · up to 5 MB</small>
              </label>
              {preview && (
                <div className="photo-upload-preview">
                  <img
                    src={preview}
                    alt="Your review photo preview"
                    onError={() => {
                      generation.current++
                      setError(
                        "This image cannot be displayed. Choose another photo.",
                      )
                      setFile(null)
                      setPreview("")
                      if (url.current) URL.revokeObjectURL(url.current)
                      url.current = ""
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      generation.current++
                      setFile(null)
                      setPreview("")
                      if (url.current) URL.revokeObjectURL(url.current)
                      url.current = ""
                    }}
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <label className="photo-consent">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I own this photo and agree to display it and my review
                  publicly.
                </span>
              </label>
              {error && (
                <p role="alert" className="account-error">
                  {error}
                </p>
              )}
              <button
                className="account-primary"
                type="submit"
                disabled={busy || !accountsAvailable}
                onClick={(e) => {
                  if (!member) {
                    e.preventDefault()
                    setToast("Please log in to submit your review.")
                  }
                }}
              >
                {busy ? "Submitting…" : "Submit photo review"}
              </button>
              <p className="photo-sample">
                Keep personal details out of your photo. Reviews are published
                after successful submission.
              </p>
              </fieldset>
            </form>
          </>
        )}
      </div>
      {active && (
        <ReviewLightbox review={active} onClose={() => setActiveId(null)} />
      )}
      {toast && (
        <div
          role="status"
          className="animate-toast fixed bottom-6 left-1/2 z-[60] max-w-[92vw] rounded-full bg-yellow px-5 py-3 text-[13px] font-medium text-ink shadow-[0_16px_40px_-16px_rgba(8,2,14,0.9)]"
        >
          {toast}
        </div>
      )}
    </section>
  )
}
