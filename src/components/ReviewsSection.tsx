import { useEffect, useRef, useState } from "react";
import { REVIEWS } from "../data/reviews";

function StarRow({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const px = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={px}
          viewBox="0 0 24 24"
          fill={n <= rating ? "var(--color-yellow)" : "none"}
          stroke={n <= rating ? "var(--color-yellow)" : "var(--color-hairline)"}
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const stripRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const motionPaused =
    paused || reducedMotion || hovered || focused || touching || hidden;
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || motionPaused) return;
    let frame: number,
      previous = 0;
    const move = (time: number) => {
      const delta = previous ? Math.min(50, time - previous) : 0;
      previous = time;
      const loopWidth = strip.scrollWidth / 2;
      if (loopWidth > strip.clientWidth)
        strip.scrollLeft = (strip.scrollLeft + delta * 0.025) % loopWidth;
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [motionPaused]);
  return (
    <section className="reviews-section" aria-labelledby="reviews-title">
      <div className="reviews-heading">
        <div>
          <p className="reviews-kicker">Wall love, on repeat</p>
          <h2 id="reviews-title">A little print. A lot of feeling.</h2>
          <p className="reviews-preview-label">
            Preview reviews · sample content
          </p>
        </div>
        <button
          type="button"
          className="reviews-toggle"
          aria-controls="reviews-strip"
          aria-pressed={paused || reducedMotion}
          disabled={reducedMotion}
          onClick={() => setPaused((p) => !p)}
        >
          <span aria-hidden="true">{paused || reducedMotion ? "▶" : "Ⅱ"}</span>
          {reducedMotion
            ? "Motion reduced"
            : paused
              ? "Resume reviews"
              : "Pause reviews"}
        </button>
      </div>
      <div
        ref={stripRef}
        id="reviews-strip"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setTouching(true)}
        onTouchEnd={() => setTouching(false)}
        onTouchCancel={() => setTouching(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
        className="reviews-marquee"
        tabIndex={0}
        role="region"
        aria-label="Customer review strip"
        aria-describedby="reviews-scroll-help"
        data-paused={motionPaused}
      >
        <div className="reviews-track">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="reviews-group"
              aria-hidden={copy === 1 ? true : undefined}
            >
              {REVIEWS.map((review, index) => (
                <article
                  key={review.id}
                  className={"review-card review-color-" + (index % 3)}
                >
                  <div className="review-top">
                    <StarRow rating={review.rating} />
                    <span aria-label={review.rating + " out of 5 stars"}>
                      {review.rating}.0
                    </span>
                    <span aria-hidden="true">“</span>
                  </div>
                  <blockquote>{review.text}</blockquote>
                  <div className="review-person">
                    <span className="review-avatar" aria-hidden="true">
                      {review.name[0]}
                    </span>
                    <div>
                      <h3>{review.name}</h3>
                      <p>
                        {review.city} · {review.posters.join(", ")}
                      </p>
                    </div>
                    <span aria-hidden="true">✳</span>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p id="reviews-scroll-help" className="reviews-help">
        Pause to read at your pace. Swipe or scroll sideways to see more.
      </p>
    </section>
  );
}
