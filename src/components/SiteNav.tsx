import useModal from "../hooks/useModal";
import CartPanel from "./CartPanel";
import Logo from "./Logo";
import ArtworkImage from "./ArtworkImage";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useStore, LOGIN_REQUIRED_EVENT } from "../context/StoreContext";
import { CloseIcon, HeartIcon, SearchIcon, MenuIcon, CartIcon } from "./icons";
import { formatMoney, priceFor } from "../data/shop";

const NAV_LINKS = [
  { label: "Shop", href: "/#catalogue" },
  { label: "Categories", href: "/categories" },
  { label: "Help", href: "/help" },
  { label: "Track Order", href: "/track" },
  { label: "Gallery Sets", href: "/gallery-sets" },
  { label: "Custom Poster", href: "/custom-poster" },
  { label: "About", href: "/about" },
  { label: "Customer login", href: "/account" },
];

type Props = {
  cartCount: number;
  bumped: boolean;
  onOpenCart: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

/**
 * Site-wide navigation shell. The only product-search entry point on the
 * storefront is the sticky header search on the home page (right next to the
 * logo). From any secondary page we surface a lightweight "Search prints" button
 * here that always routes the visitor to `/#catalogue`, where the real search
 * input lives — so clicking search anywhere on the site lands them on the
 * products section and renders results there.
 */
export default function SiteNav({
  cartCount,
  bumped,
  onOpenCart,
  mobileOpen,
  onMobileOpenChange,
}: Props) {
  const { member } = useCustomerAuth();
  const { wishlist, toggleWishlist, posters } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const drawerOpen = mobileOpen ?? internalDrawerOpen;
  const setDrawerOpen = (v: boolean) => {
    if (onMobileOpenChange) onMobileOpenChange(v);
    else setInternalDrawerOpen(v);
  };
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const drawerRef = useModal(drawerOpen, () => setDrawerOpen(false));
  const wishlistRef = useModal<HTMLElement>(wishlistOpen, () =>
    setWishlistOpen(false),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const openWishlist = () => {
    if (!member) return window.dispatchEvent(new Event(LOGIN_REQUIRED_EVENT));
    setWishlistOpen(true);
  };
  const openCart = () => {
    if (!member) return window.dispatchEvent(new Event(LOGIN_REQUIRED_EVENT));
    if (mobileOpen !== undefined) onOpenCart();
    else setCartOpen(true);
  };
  const goToCatalogSearch = () => {
    // Always drop the visitor into the real catalogue search bar — scroll on
    // the home page, otherwise navigate there with #catalogue so HomePage's
    // hash-scroll handler brings them to the grid on arrival.
    if (location.pathname === "/") {
      const el = document.getElementById("catalogue");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Focus the search input once the scroll begins so typing starts
      // immediately without an extra click.
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[aria-label="Search posters"]',
        );
        input?.focus();
      }, 180);
    } else {
      navigate("/#catalogue");
    }
  };

  const wishlistCount = posters.filter(
    (p) => p.status !== "draft" && wishlist.includes(p.id),
  ).length;

  // Wishlist posters
  const wishlisted = posters.filter(
    (p) => p.status !== "draft" && wishlist.includes(p.id),
  );

  function NavLink({ label, href }: { label: string; href: string }) {
    const isRoute = href.startsWith("/") && !href.startsWith("/#");
    if (isRoute) {
      return (
        <Link
          to={href}
          className="text-[13px] font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-magenta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)]"
        >
          {label}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className="text-[13px] font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-magenta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)]"
      >
        {label}
      </a>
    );
  }

  return (
    <>
      {mobileOpen === undefined && (
        <header className="mobile-site-nav md:hidden">
          <Link to="/" aria-label="Wall Stories home">
            <Logo className="h-12 w-16" />
          </Link>
          <div>
            <button aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <MenuIcon className="h-5 w-5" />
            </button>
            <button
              aria-label={`Open selection, ${cartCount} items`}
              onClick={openCart}
            >
              <CartIcon className="h-5 w-5" />
              <span>{cartCount}</span>
            </button>
          </div>
        </header>
      )}
      {/* ── Desktop nav row ─────────────────────────────────────────── */}
      <nav className="hidden border-b border-[var(--color-hairline)]/60 bg-[var(--color-ground)]/95 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-8 py-2.5">
          {/* Primary nav links */}
          <NavLink label="Shop" href="/#catalogue" />
          <NavLink label="Categories" href="/categories" />
          <NavLink label="Help" href="/help" />
          <NavLink label="Gallery Sets" href="/gallery-sets" />
          <NavLink label="Custom Poster" href="/custom-poster" />
          <NavLink label="About" href="/about" />

          <div className="ml-auto flex items-center gap-2">
  

            <button
              type="button"
              onClick={openCart}
              aria-label={`Open selection, ${cartCount} items`}
              className={`nav-cart-button ${bumped ? "animate-pop" : ""}`}
            >
              <CartIcon className="h-5 w-5" />
              <span>{cartCount}</span>
            </button>
            <Link to="/account" className="nav-account-link">
              {member ? "My account" : "Login"}
            </Link>
            {/* Wishlist */}
            <button
              type="button"
              aria-label={`Wishlist, ${wishlistCount} items`}
              onClick={() => openWishlist()}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-ground-soft)] hover:text-[var(--color-magenta)]"
            >
              <HeartIcon className="h-5 w-5" filled={wishlistCount > 0} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-magenta)] px-0.5 text-[9px] font-semibold text-[var(--color-ground)]">
                  {wishlistCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="animate-fade absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-[3px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="animate-slide-in-left absolute left-0 top-0 flex h-full w-[80vw] max-w-[320px] flex-col bg-[var(--color-ground)] shadow-[8px_0_32px_rgba(8,2,14,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-4">
              <span className="font-display font-semibold text-[17px] text-[var(--color-ink)] tracking-tight">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-ground-soft)]"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto py-4">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  goToCatalogSearch();
                }}
                className="flex min-h-[52px] items-center gap-3 px-5 text-[16px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-ground-soft)] hover:text-[var(--color-magenta)] focus-visible:outline-none"
              >
                <SearchIcon className="h-5 w-5" />
                Search prints
              </button>

              {NAV_LINKS.map((l) =>
                l.href.startsWith("/") && !l.href.startsWith("/#") ? (
                  <Link
                    key={l.label}
                    to={l.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[52px] items-center px-5 text-[16px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-ground-soft)] hover:text-[var(--color-magenta)] focus-visible:outline-none"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[52px] items-center px-5 text-[16px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-ground-soft)] hover:text-[var(--color-magenta)] focus-visible:outline-none"
                  >
                    {l.label}
                  </a>
                ),
              )}

              <div className="mx-5 mt-4 border-t border-[var(--color-hairline)] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    openWishlist();
                  }}
                  className="flex min-h-[52px] w-full items-center gap-3 px-0 text-[16px] font-medium text-[var(--color-ink)] transition hover:text-[var(--color-magenta)]"
                >
                  <HeartIcon className="h-5 w-5" filled={wishlistCount > 0} />
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-magenta)] px-1 text-[11px] font-semibold text-[var(--color-ground)]">
                      {wishlistCount}
                    </span>
                  )}
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* ── Wishlist drawer ─────────────────────────────────────────── */}
      {wishlistOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="animate-fade absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-[3px]"
            onClick={() => setWishlistOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={wishlistRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your wishlist"
            className="animate-slide-in relative flex h-full w-full max-w-[400px] flex-col bg-[var(--color-ground)] shadow-[-20px_0_60px_-30px_rgba(8,2,14,0.7)]"
          >
            <header className="flex items-center justify-between border-b border-[var(--color-hairline)] px-6 py-5">
              <div>
                <h2 className="font-display font-semibold tracking-[-0.02em] text-[20px] leading-none text-[var(--color-ink)]">
                  Wishlist
                </h2>
                <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
                  {wishlistCount === 0
                    ? "Nothing saved yet"
                    : `${wishlistCount} ${wishlistCount === 1 ? "print" : "prints"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWishlistOpen(false)}
                aria-label="Close wishlist"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-ground-soft)]"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </header>

            <div className="rail flex-1 overflow-y-auto px-6 py-4">
              {wishlisted.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <HeartIcon
                    className="h-12 w-12 text-[var(--color-ink)]/15"
                    filled={false}
                  />
                  <p className="text-[14px] text-[var(--color-ink-soft)]">
                    Tap the heart on any print to save it here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {wishlisted.map((p) => (
                    <li
                      key={p.id}
                      className="flex gap-4 rounded-[12px] border border-[var(--color-hairline)] p-3"
                    >
                      <ArtworkImage
                        src={p.image}
                        alt={p.alt}
                        className="poster-frame poster-frame-mini h-20 w-14 shrink-0 rounded-[4px] object-cover shadow-sm"
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <Link
                            to={`/print/${p.id}`}
                            onClick={() => setWishlistOpen(false)}
                            className="truncate font-medium text-[14px] text-[var(--color-ink)] underline underline-offset-4"
                          >
                            {p.title}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-[var(--color-magenta)]">
                            {p.code}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                            from {formatMoney(priceFor(p, p.sizes[0]))}
                          </p>
                          <button
                            type="button"
                            aria-label={`Remove ${p.title} from wishlist`}
                            onClick={() => toggleWishlist(p.id)}
                            className="rounded-full p-1.5 text-[var(--color-magenta)] transition hover:bg-[var(--color-magenta)]/10"
                          >
                            <HeartIcon className="h-4 w-4" filled />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-[var(--color-hairline)] px-6 py-5">
              <a
                href="/#catalogue"
                onClick={() => setWishlistOpen(false)}
                className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-[var(--color-ground-soft)] text-[14px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-hairline)]"
              >
                Browse all prints
              </a>
            </div>
          </aside>
        </div>
      )}
      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onToast={setNotice}
      />
      {notice && (
        <p role="status" className="site-notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss notice">
            ×
          </button>
        </p>
      )}
    </>
  );
}
