import { useSiteContent } from "../context/SiteContentContext";
import { DEFAULT_COPY } from "../data/siteContent";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import { useStore } from "../context/StoreContext";
import { Link } from "react-router";

export default function AboutPage() {
  const { cartCount, shop } = useStore();
  const { content } = useSiteContent();
  const copy = { ...DEFAULT_COPY, ...content.copy };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav cartCount={cartCount} bumped={false} onOpenCart={() => {}} />

      <main className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8 sm:py-20">
        {/* Hero */}
        <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-20">
          <div>
            <p
              className="text-[11px] tracking-[0.28em] uppercase"
              style={{
                color: "var(--color-magenta)",
                fontFamily: "var(--font-display)",
              }}
            >
              About us
            </p>
            <h1
              className="mt-3 text-[32px] font-semibold tracking-[-0.03em] leading-tight sm:text-[48px]"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-display)",
              }}
            >
              {copy.aboutTitle}
            </h1>
            <p
              className="mt-5 text-[15px] leading-relaxed"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {copy.aboutIntro}
            </p>
            <p
              className="mt-4 text-[15px] leading-relaxed"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {copy.aboutStory}
            </p>
          </div>

        </div>

        {/* Values */}
        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Curated, not collected",
              body: "Every image in the catalogue has been chosen deliberately. If it isn't something we'd hang ourselves, it doesn't make the cut.",
            },
            {
              title: "Printed to order",
              body: "Nothing is pre-printed and sitting in a box. Each order goes to press fresh — that's why the quality is consistent.",
            },
            {
              title: "300 GSM matte art paper",
              body: "The same substrate used in fine-art and photo books. Deep blacks, no glare, a subtle surface texture. It just looks right.",
            },
          ].map((v) => (
            <div
              key={v.title}
              className="rounded-[14px] border p-6"
              style={{
                background: "var(--color-ground)",
                borderColor: "var(--color-hairline)",
              }}
            >
              <div
                className="mb-3 h-px w-8"
                style={{ background: "var(--color-magenta)" }}
              />
              <h3
                className="text-[17px] font-semibold"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {v.title}
              </h3>
              <p
                className="mt-2 text-[14px] leading-relaxed"
                style={{ color: "var(--color-ink-soft)" }}
              >
                {v.body}
              </p>
            </div>
          ))}
        </section>

        {/* Process */}
        <section className="mt-20">
          <h2
            className="mb-8 text-[28px] font-semibold tracking-[-0.02em]"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            How we work
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {[
              {
                n: "01",
                title: "Choose your prints",
                body: "Browse the catalogue and add the ones you like. No account needed.",
              },
              {
                n: "02",
                title: "Send your selection",
                body: "Your selection gets formatted as a message — send it over on Instagram.",
              },
              {
                n: "03",
                title: "We confirm & print",
                body: "We reply with sizing, pricing, and payment details, then print your order.",
              },
              {
                n: "04",
                title: "Ships to your door",
                body: "Flat-packed with rigid board backing. Typically 4–6 days across India.",
              },
            ].map((s) => (
              <div key={s.n} className="relative pl-12">
                <span
                  className="absolute left-0 top-0 text-[36px] font-bold leading-none"
                  style={{
                    color: "var(--color-hairline)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {s.n}
                </span>
                <h4
                  className="text-[15px] font-semibold"
                  style={{
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {s.title}
                </h4>
                <p
                  className="mt-1.5 text-[13px] leading-relaxed"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="mt-20 rounded-[20px] px-8 py-14 text-center"
          style={{ background: "var(--color-ink)" }}
        >
          <h2
            className="text-[28px] font-semibold tracking-[-0.02em] sm:text-[36px]"
            style={{
              color: "var(--color-ground)",
              fontFamily: "var(--font-display)",
            }}
          >
            Find your print.
          </h2>
          <p
            className="mx-auto mt-3 max-w-[44ch] text-[15px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            15+ prints spanning photography, illustration, abstract, and
            typography.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-full px-6 py-3 text-[14px] font-medium transition hover:opacity-90"
              style={{
                background: "var(--color-magenta)",
                color: "var(--color-ground)",
              }}
            >
              Browse the catalogue
            </Link>
            <Link
              to="/gallery-sets"
              className="inline-flex items-center rounded-full border px-6 py-3 text-[14px] font-medium transition hover:bg-white/10"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              See gallery sets
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
