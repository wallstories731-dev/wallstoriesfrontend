import { useState } from "react";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import { useStore } from "../context/StoreContext";
import { useSiteContent } from "../context/SiteContentContext";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const DEFAULT_FAQS = [
  {
    id: "d1",
    question: "How do I place an order?",
    answer:
      "Browse the catalogue, add the prints you like to your selection, fill in your name and city, then send the list to us on Instagram. We confirm sizes, pricing, and payment details in chat — usually within a few hours.",
  },
  {
    id: "d2",
    question: "What paper do you print on?",
    answer:
      "All our prints use 300 GSM matte art paper — the same stock used in high-end photo books. It has a subtle texture, deep blacks, and no glare. Ideal for wall art.",
  },
  {
    id: "d3",
    question: "How long does delivery take?",
    answer:
      "Most orders ship within 2–3 business days of payment. Delivery across India typically takes another 3–4 days, depending on location. You'll get a tracking link as soon as it's dispatched.",
  },
  {
    id: "d4",
    question: "What sizes are available?",
    answer:
      "We offer A4, A3, A2, 12×18 inches, and 18×24 inches. Each listing shows which sizes are available for that particular print. Size availability depends on the original image resolution.",
  },
  {
    id: "d5",
    question: "Can I return or exchange a print?",
    answer:
      "Since every print is made to order, we don't accept returns for change of mind. However, if your print arrives damaged or with a printing defect, contact us immediately — we'll reprint and reship at no cost.",
  },
  {
    id: "d6",
    question: "Do you ship outside India?",
    answer:
      "Not currently — we ship across India only. International shipping may be added in the future; follow us on Instagram for updates.",
  },
  {
    id: "d7",
    question: "Can I order a custom size not listed?",
    answer:
      "Drop us a message on Instagram and we'll do our best to accommodate. Custom sizes depend on the source image resolution and may be priced differently.",
  },
  {
    id: "d8",
    question: "How do I pay?",
    answer:
      "We accept UPI, bank transfer, and most major payment apps (PhonePe, GPay, Paytm). Payment details are shared in chat after you confirm your order.",
  },
];

function FaqItem({
  item,
}: {
  item: { id: string; question: string; answer: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-[12px] border transition"
      style={{
        borderColor: "var(--color-hairline)",
        background: "var(--color-ground)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span
          className="text-[15px] font-medium"
          style={{ color: "var(--color-ink)", fontFamily: "var(--font-sans)" }}
        >
          {item.question}
        </span>
        <span
          style={{
            color: "var(--color-ink-soft)",
            transform: open ? "rotate(180deg)" : "none",
            display: "inline-flex",
            transition: "transform 0.2s",
          }}
        >
          <ChevronIcon className="h-5 w-5 shrink-0" />
        </span>
      </button>
      {open && (
        <div
          className="border-t px-5 pb-5 pt-4"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const { cartCount } = useStore();
  const { content } = useSiteContent();

  const faqs = content.faq;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav cartCount={cartCount} bumped={false} onOpenCart={() => {}} />

      <main className="mx-auto max-w-[720px] px-4 py-14 sm:px-8 sm:py-20">
        <header className="mb-12 text-center">
          <p
            className="text-[11px] tracking-[0.28em] uppercase"
            style={{
              color: "var(--color-magenta)",
              fontFamily: "var(--font-display)",
            }}
          >
            Help
          </p>
          <h1
            className="mt-2 text-[32px] font-semibold tracking-[-0.03em] sm:text-[44px]"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            Frequently asked questions
          </h1>
        </header>

        <div className="space-y-3">
          {faqs.map((f) => (
            <FaqItem key={f.id} item={f} />
          ))}
        </div>

        <div
          className="mt-12 rounded-[16px] border p-8 text-center"
          style={{
            borderColor: "var(--color-hairline)",
            background: "var(--color-ground-soft)",
          }}
        >
          <p
            className="text-[16px] font-medium"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            Still have questions?
          </p>
          <p
            className="mt-2 text-[14px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Reach us directly — we typically reply within a few hours.
          </p>
          <a
            href="/contact"
            className="mt-5 inline-flex items-center rounded-full px-6 py-2.5 text-[14px] font-medium transition hover:opacity-90"
            style={{
              background: "var(--color-magenta)",
              color: "var(--color-ground)",
            }}
          >
            Contact us
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
