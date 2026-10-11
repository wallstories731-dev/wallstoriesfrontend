import { useSiteContent } from "../context/SiteContentContext";
import { DEFAULT_COPY } from "../data/siteContent";
import FooterGame from "./FooterGame";
import { Link } from "react-router";
import Logo from "./Logo";
import { useStore } from "../context/StoreContext";
import { getContactSettings } from "../api";

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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
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
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

const SHOP_LINKS = [
  { label: "All Prints", to: "/" },
  { label: "Gallery Sets", to: "/gallery-sets" },
  { label: "Custom Poster", to: "/custom-poster" },
];

const INFO_LINKS = [
  { label: "Help", to: "/help" },
  { label: "About Us", to: "/about" },
  { label: "How to Order", to: "/#how-to-order" },
  { label: "FAQ", to: "/faq" },
  { label: "Customer login", to: "/account" },
  { label: "Shipping & Returns", to: "/shipping" },
];

export default function Footer() {
  const { shop } = useStore();
  const { content } = useSiteContent();
  const waNumber = getContactSettings().whatsappNumber;

  return (
    <footer
      className="mt-20 border-t"
      style={{
        borderColor: "var(--color-hairline)",
        background: "var(--color-ground)",
      }}
    >
      <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-8">
        <FooterGame />
      </div>
      {/* Main grid */}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 py-14 sm:px-8 md:grid-cols-4">
        {/* Brand col */}
        <div className="md:col-span-1">
          <Logo className="h-16 w-[84px]" />
          <p
            className="mt-3 text-[13px] leading-relaxed"
            style={{ color: "var(--color-ink)" }}
          >
            {content.copy?.footerDescription ?? DEFAULT_COPY.footerDescription}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={`https://instagram.com/${shop.instagramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-magenta hover:text-magenta"
              style={{
                borderColor: "var(--color-hairline)",
                color: "var(--color-ink-soft)",
              }}
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-[#25d366] hover:text-[#25d366]"
              style={{
                borderColor: "var(--color-hairline)",
                color: "var(--color-ink-soft)",
              }}
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Shop links */}
        <div>
          <p
            className="mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Shop
          </p>
          <ul className="space-y-2.5">
            {SHOP_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="text-[14px] transition hover:text-magenta"
                  style={{
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Info links */}
        <div>
          <p
            className="mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Info
          </p>
          <ul className="space-y-2.5">
            {INFO_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="text-[14px] transition hover:text-magenta"
                  style={{
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <p
            className="mb-1 text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--color-ink-soft)" }}
          >
            New drops
          </p>
          <p
            className="mb-4 text-[13px] leading-snug"
            style={{ color: "var(--color-ink)" }}
          >
            Follow our Instagram for new prints and fresh wall inspiration.
          </p>
          <a
            href={`https://instagram.com/${shop.instagramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-3 rounded-full bg-magenta px-5 text-[13px] font-medium text-white"
          >
            Follow new drops <span>↗</span>
          </a>
          <p
            className="mt-3 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Or DM on Instagram{" "}
            <a
              href={`https://instagram.com/${shop.instagramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition hover:text-magenta"
              style={{ color: "var(--color-ink-soft)" }}
            >
              @{shop.instagramUsername}
            </a>
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-[12px]" style={{ color: "var(--color-ink)" }}>
            © {new Date().getFullYear()} {shop.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Shipping & Returns", to: "/shipping" },
              { label: "Help", to: "/help" },
              { label: "Admin login", to: "/admin" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="text-[12px] transition hover:text-magenta"
                style={{ color: "var(--color-ink)" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
