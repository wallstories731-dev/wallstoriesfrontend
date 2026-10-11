import { loadAdminSettings } from "../api/settings";
import { useSiteContent } from "../context/SiteContentContext";
import { DEFAULT_COPY } from "../data/siteContent";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import { useStore } from "../context/StoreContext";
import { Link } from "react-router";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="h-px flex-1"
        style={{ background: "var(--color-hairline)" }}
      />
      <h2
        className="shrink-0 text-[11px] font-semibold tracking-[0.2em] uppercase"
        style={{
          color: "var(--color-ink-soft)",
          fontFamily: "var(--font-display)",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

export default function ShippingPage() {
  const { cartCount } = useStore();
  const { content } = useSiteContent();
  const copy = { ...DEFAULT_COPY, ...content.copy };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav
        cartCount={cartCount}
        bumped={false}
        onOpenCart={() => {}}
        query=""
        onQueryChange={() => {}}
        SearchSlot={null}
        CartSlot={null}
      />

      <main className="mx-auto max-w-[720px] px-4 py-14 sm:px-8 sm:py-20">
        <header className="mb-14">
          <p
            className="text-[11px] tracking-[0.28em] uppercase"
            style={{
              color: "var(--color-magenta)",
              fontFamily: "var(--font-display)",
            }}
          >
            Policies
          </p>
          <h1
            className="mt-2 text-[32px] font-semibold tracking-[-0.03em] sm:text-[44px]"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-display)",
            }}
          >
            Shipping &amp; Returns
          </h1>
        </header>

        <div
          className="space-y-12 text-[15px] leading-relaxed"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {/* Shipping */}
          <section>
            <SectionTitle>Shipping</SectionTitle>
            <div className="space-y-4">
              <p>{copy.shippingIntro}</p>
              <div
                className="overflow-hidden rounded-[12px] border"
                style={{ borderColor: "var(--color-hairline)" }}
              >
                {[
                  {
                    label: "Production time",
                    value: "2–3 business days after payment",
                  },
                  {
                    label: "Delivery across India",
                    value: "3–4 business days",
                  },
                  {
                    label: "Total (typical)",
                    value: loadAdminSettings().shippingDaysText,
                  },
                  {
                    label: "Packaging",
                    value:
                      "Rolled in a tube or flat-packed with rigid backing board",
                  },
                  {
                    label: "Tracking",
                    value: "A tracking link is sent as soon as the order ships",
                  },
                  {
                    label: "Carrier",
                    value:
                      "Delhivery, BlueDart, or India Post depending on your pin code",
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex flex-col gap-0.5 border-b px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                    style={{ borderColor: "var(--color-hairline)" }}
                  >
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {r.label}
                    </span>
                    <span className="text-[13px] sm:text-right">{r.value}</span>
                  </div>
                ))}
              </div>
              <p>
                We currently ship within India only. International shipping may
                be added in the future.
              </p>
            </div>
          </section>

          {/* Packaging */}
          <section>
            <SectionTitle>Packaging</SectionTitle>
            <div className="space-y-4">
              <p>
                Prints up to A3 are shipped flat inside a rigid board envelope —
                no rolling, no creasing. A2 and larger prints are carefully
                rolled and placed in a sturdy tube.
              </p>
              <p>Every shipment includes:</p>
              <ul className="space-y-2 pl-4">
                {[
                  "Acid-free tissue wrap around the print",
                  "Rigid backing board (flat orders)",
                  "Moisture-resistant outer sleeve",
                  "A handwritten note (because why not)",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--color-magenta)" }}
                    />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Returns */}
          <section>
            {copy.returnsIntro && (
              <p className="whitespace-pre-line">{copy.returnsIntro}</p>
            )}
            <SectionTitle>Returns &amp; refunds</SectionTitle>
            <div className="space-y-4">
              <p>
                Because every print is made specifically for your order,{" "}
                <strong style={{ color: "var(--color-ink)" }}>
                  we don&rsquo;t accept returns for change of mind
                </strong>
                . Please check the image, size, and orientation carefully before
                confirming.
              </p>

              <p>We absolutely cover you if something goes wrong on our end:</p>

              <div className="space-y-3">
                {[
                  {
                    title: "Damaged in transit",
                    body: "Take a photo of the damage and the packaging and send it to us within 48 hours of delivery. We&rsquo;ll reprint and reship at no extra cost.",
                  },
                  {
                    title: "Printing defect",
                    body: "If colours are significantly off or there&rsquo;s a visible print defect, send us a clear photo. We&rsquo;ll assess it and reprint if it&rsquo;s our error.",
                  },
                  {
                    title: "Wrong item shipped",
                    body: "Rare, but it happens. Contact us within 48 hours and we&rsquo;ll ship the correct print immediately.",
                  },
                ].map((c) => (
                  <div
                    key={c.title}
                    className="rounded-[12px] border p-4"
                    style={{
                      borderColor: "var(--color-hairline)",
                      background: "var(--color-ground-soft)",
                    }}
                  >
                    <p
                      className="font-semibold"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {c.title}
                    </p>
                    <p className="mt-1 text-[13px]">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact */}
          <div
            className="rounded-[16px] border p-6 text-center"
            style={{
              borderColor: "var(--color-hairline)",
              background: "var(--color-ground)",
            }}
          >
            <p
              className="font-medium"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-display)",
              }}
            >
              Questions about an order?
            </p>
            <p className="mt-1 text-[14px]">
              Reach us on Instagram or via the contact form — we reply within a
              few hours.
            </p>
            <Link
              to="/contact"
              className="mt-4 inline-flex rounded-full px-5 py-2.5 text-[14px] font-medium transition hover:opacity-90"
              style={{
                background: "var(--color-magenta)",
                color: "var(--color-ground)",
              }}
            >
              Contact us
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
