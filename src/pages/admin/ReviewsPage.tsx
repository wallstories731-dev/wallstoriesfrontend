import { useEffect, useState } from "react"
import {
  loadModerationReviews,
  approveReview,
  removeReview,
  type PhotoReview,
} from "../../api/reviews"
import ArtworkImage from "../../components/ArtworkImage"
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PhotoReview[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState("")
  const refresh = async () => {
    try {
      setReviews(await loadModerationReviews())
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reviews could not be loaded.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void refresh()
  }, [])
  async function action(id: string, remove = false) {
    setBusy(id)
    try {
      if (remove) await removeReview(id)
      else await approveReview(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review update failed.")
    } finally {
      setBusy("")
    }
  }
  return (
    <main>
      <h1 className="font-display text-3xl font-semibold">Photo reviews</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Approve customer photos before they appear in the shop. Remove only
        reviews that should not be displayed.
      </p>
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading reviews…</p>
      ) : !reviews.length ? (
        <p className="mt-6">No photo reviews yet.</p>
      ) : (
        <div className="moderation-grid">
          {reviews.map((r) => (
            <article key={r.id} className="moderation-card">
              <ArtworkImage src={r.photo} alt={"Wall photo by " + r.name} />
              <div>
                <h2>
                  {r.name} · {r.city}
                </h2>
                <p>
                  {r.rating}/5 ·{" "}
                  {r.approved ? "Published" : "Awaiting approval"}
                </p>
                <blockquote>{r.text}</blockquote>
                <div className="moderation-actions">
                  {!r.approved && (
                    <button disabled={!!busy} onClick={() => void action(r.id)}>
                      Approve photo review
                    </button>
                  )}
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this photo review and its photo?",
                        )
                      )
                        void action(r.id, true)
                    }}
                  >
                    Remove review
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
