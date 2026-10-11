import { useSiteContent } from "../context/SiteContentContext";
import { Link, useLocation } from "react-router";
import Logo from "../components/Logo";
import AnnouncementBar from "../components/AnnouncementBar";
import Footer from "../components/Footer";
import { useStore } from "../context/StoreContext";

const FAQS = [
  {
    q: "What sizes do your posters come in?",
    a: "All prints are available in five sizes: A4 (21 × 29.7 cm), A3 (29.7 × 42 cm), A2 (42 × 59.4 cm), 12×18 inches (30.5 × 45.7 cm), and 18×24 inches (45.7 × 61 cm). Prices scale with size — A4 is always the starting price shown.",
  },
  {
    q: "How does shipping work?",
    a: "We print to order and ship via tracked courier across India. Orders typically ship within 1–2 working days of payment confirmation. Delivery takes 3–4 working days to major metros (Delhi, Mumbai, Bengaluru, Chennai, Hyderabad) and 5–7 working days elsewhere. Shipping charges are confirmed in chat before you pay.",
  },
  {
    q: "What is your return or replacement policy?",
    a: "We replace prints that arrive damaged or with a visible print defect — just send us a photo of the damage within 48 hours of delivery on Instagram. We don't accept returns for change of mind, but if you're unsure about a print, DM us and we'll help you decide before you order.",
  },
  {
    q: "How do I check my order status?",
    a: "After you send your order, you'll receive a reference code (WS-YYYY-XXXX). Share that code in a DM on Instagram and we'll give you the latest update. Once shipped, we'll send the tracking number in chat.",
  },
  {
    q: "Can I get a custom or personalised poster?",
    a: "Yes! We do custom posters with your text, quotes, or artwork. Prices and turnaround depend on the complexity — start a conversation on Instagram with what you have in mind and we'll take it from there.",
  },
];

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

export default function HelpPage() {
  const { content } = useSiteContent();
  const { pathname } = useLocation();
  const tracking = pathname === "/track";
  const { shop } = useStore();
  const INSTAGRAM_DM_URL = "https://ig.me/m/" + shop.instagramUsername;
  return (
    <div className="min-h-screen bg-[var(--color-ground)]">
      <AnnouncementBar />

      {/* Simple top nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-hairline)] bg-[var(--color-ground)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3 sm:px-8">
          <Link to="/" aria-label="Wall Stories home" className="shrink-0">
            <Logo className="h-10 w-[54px]" />
          </Link>
          <nav className="ml-6 hidden items-center gap-6 md:flex">
            <Link
              to="/#catalogue"
              className="text-[13px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-magenta)] transition"
            >
              Shop
            </Link>
            <Link
              to="/help"
              className="text-[13px] font-medium text-[var(--color-magenta)]"
            >
              Help
            </Link>
          </nav>
          <div className="ml-auto">
            <Link
              to="/"
              className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[13px] text-[var(--color-ink)] transition hover:border-[var(--color-magenta)] hover:text-[var(--color-magenta)]"
            >
              ← Back to shop
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 py-12 sm:px-8 sm:py-16">
        {/* Page heading */}
        <div className="mb-10 text-center">
          <p className="text-[11px] tracking-[0.28em] text-[var(--color-magenta)] uppercase">
            Support
          </p>
          <h1
            className="mt-3 tracking-[-0.03em] leading-[1.1] text-[var(--color-ink)] text-[32px] sm:text-[44px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {tracking ? "Track your order" : "How can we help?"}
          </h1>
          {content.copy?.helpIntro && (
            <p className="my-6 whitespace-pre-line text-sm leading-7">
              {content.copy.helpIntro}
            </p>
          )}
          <p className="mt-4 text-[15px] text-[var(--color-ink)] leading-relaxed">
            {tracking
              ? "Send your order reference in Instagram. The shop will confirm its status and share the courier tracking link when shipped."
              : "Browse the quick answers below — or DM us on Instagram for anything else."}
          </p>
        </div>

        {/* Instagram DM CTA */}
        <div className="mb-12 rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-ground-soft)] p-6 text-center">
          <div className="mb-3 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-magenta)]/10">
              <InstagramIcon className="h-6 w-6 text-[var(--color-magenta)]" />
            </span>
          </div>
          <p className="font-display font-semibold tracking-[-0.02em] text-[18px] text-[var(--color-ink)]">
            Talk to us on Instagram
          </p>
          <p className="mt-2 text-[13px] text-[var(--color-ink)] leading-relaxed">
            Our fastest support channel. Send a DM and we typically reply within
            a few hours.
          </p>
          <a
            href={INSTAGRAM_DM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--color-magenta)] px-7 py-3 text-[14px] font-medium text-[var(--color-ground)] shadow-[0_10px_24px_-12px_rgba(229,21,127,0.8)] transition hover:bg-[var(--color-magenta-deep)]"
          >
            <InstagramIcon className="h-4 w-4" />
            DM @{shop.instagramUsername}
          </a>
        </div>

        {/* FAQ accordion */}
        <div>
          <p className="mb-5 text-[11px] font-semibold tracking-[0.2em] text-[var(--color-ink-soft)] uppercase">
            Quick answers
          </p>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* Still stuck */}
        <div className="mt-14 rounded-[14px] border border-[var(--color-hairline)] p-6 text-center">
          <p className="text-[14px] font-medium text-[var(--color-ink)]">
            Still need help?
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-ink)] leading-relaxed">
            Send us a DM on Instagram with your order reference code and we'll
            sort it out.
          </p>
          <a
            href={INSTAGRAM_DM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-magenta)] underline underline-offset-4 transition hover:text-[var(--color-magenta-deep)]"
          >
            Open Instagram DM →
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-ground)] transition open:shadow-[0_4px_16px_-8px_rgba(8,2,14,0.12)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[14px] font-medium text-[var(--color-ink)]">
        <span>{q}</span>
        <span className="h-5 w-5 shrink-0 rounded-full border border-[var(--color-hairline)] bg-[var(--color-ground-soft)] text-center text-[12px] leading-5 text-[var(--color-ink-soft)] transition group-open:rotate-45 group-open:border-[var(--color-magenta)] group-open:text-[var(--color-magenta)]">
          +
        </span>
      </summary>
      <div className="border-t border-[var(--color-hairline)] px-5 py-4 text-[13px] leading-relaxed text-[var(--color-ink)]">
        {a}
      </div>
    </details>
  );
}
