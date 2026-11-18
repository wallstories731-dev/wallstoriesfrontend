import { useSiteContent } from "../context/SiteContentContext";
import { useMemo, useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import CartPanel from "../components/CartPanel";
import PosterCard from "../components/PosterCard";
import PosterDetail from "../components/PosterDetail";
import PosterPlayground from "../components/PosterPlayground";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import HowItWorks from "../components/HowItWorks";
import FilterDrawer, {
  DEFAULT_FILTERS,
  type FilterState,
} from "../components/FilterDrawer";
import Logo from "../components/Logo";
import PhotoReviews from "../components/PhotoReviews";
import ReviewsSection from "../components/ReviewsSection";
import Footer from "../components/Footer";
import {
  ChevronIcon,
  FrameIcon,
  SearchIcon,
  CartIcon,
  FilterIcon,
  CloseIcon,
  TruckIcon,
  SparkleIcon,
  LeafIcon,
  MenuIcon,
} from "../components/icons";
import { Link } from "react-router";
import { useStore } from "../context/StoreContext";
import { formatMoney, priceFor, type Poster } from "../data/shop";

type Sort = "newest" | "low" | "high";

const sortLabels: Record<Sort, string> = {
  newest: "Newest",
  low: "Price: low → high",
  high: "Price: high → low",
};

const TRUST_CHIPS = [
  { label: "300 GSM matte", Icon: SparkleIcon },
  { label: "Printed to order", Icon: FrameIcon },
  { label: "Pan-India shipping", Icon: TruckIcon },
  { label: "5 sizes available", Icon: LeafIcon },
];

export default function HomePage() {
  const store = useStore();
  const { content } = useSiteContent();
  const location = useLocation();
  const navigate = useNavigate();

  // Hydrate search state from `?q=` so visitors arriving from other pages
  // (via the nav "Search" button → `/#catalogue?q=…`) see the pre-filtered
  // catalogue immediately. We intentionally only read on mount — later typing
  // flows back into the URL via syncQueryToUrl below.
  const initialQuery = (() => {
    const params = new URLSearchParams(location.search);
    return params.get("q") ?? "";
  })();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>(
    () => new URLSearchParams(location.search).get("category") || "All",
  );
  const [sort, setSort] = useState<Sort>("newest");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [active, setActive] = useState<Poster | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bumped, setBumped] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setBumped(true);
    const t = setTimeout(() => setBumped(false), 450);
    return () => clearTimeout(t);
  }, [store.cartCount]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  const shopCategories = useMemo(() => {
    const listed = store.categories.filter((c) => c !== "All");
    const extra = [
      ...new Set(
        store.posters.filter((p) => p.status !== "draft").map((p) => p.category).filter(Boolean),
      ),
    ]
      .filter((c) => !listed.includes(c))
      .sort();
    return ["All", ...listed, ...extra];
  }, [store.posters, store.categories]);

  useEffect(() => {
    if (store.posters.length > 0 && category !== "All" && !shopCategories.includes(category))
      setCategory("All");
  }, [category, shopCategories, store.posters.length]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = store.posters.filter((p) => {
      if (p.status === "draft") return false;
      if (
        filters.orientation !== "all" &&
        filters.orientation !== (p.orientation || "portrait")
      )
        return false;
      if (category !== "All" && p.category !== category) return false;
      if (
        q &&
        !(p.title + " " + p.code + " " + p.category + " " + (p.tags || []).join(" "))
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (
        filters.tags.length > 0 &&
        !filters.tags.some((t) =>
          (p.tags || []).some((pt) => pt.trim().toLowerCase() === t),
        )
      )
        return false;
      if (
        filters.sizes.length > 0 &&
        !filters.sizes.some((s) => p.sizes.includes(s))
      )
        return false;
      if (Math.min(...p.sizes.map((s) => priceFor(p, s))) > filters.maxPrice)
        return false;
      return true;
    });
    const cheapest = (p: Poster) =>
      Math.min(...p.sizes.map((s) => priceFor(p, s)));
    return [...list].sort((a, b) => {
      if (sort === "low") return cheapest(a) - cheapest(b);
      if (sort === "high") return cheapest(b) - cheapest(a);
      return b.added - a.added;
    });
  }, [query, category, sort, filters, store.posters]);

  const featured = useMemo(() => {
    const available = store.posters.filter((p) => p.status !== "draft");
    return (
      available.find((p) => p.id === store.featuredConfig.posterId) ??
      available[0] ??
      null
    );
  }, [store.posters, store.featuredConfig.posterId]);

  const isFiltered =
    filters.sizes.length > 0 ||
    filters.tags.length > 0 ||
    filters.maxPrice !== DEFAULT_FILTERS.maxPrice ||
    filters.orientation !== "all";

  const clearAll = () => {
    setQuery("");
    setCategory("All");
    setFilters(DEFAULT_FILTERS);
  };

  const activeFilterCount =
    filters.sizes.length +
    filters.tags.length +
    (filters.maxPrice !== DEFAULT_FILTERS.maxPrice ? 1 : 0) +
    (filters.orientation !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen bg-ground">
      <a href="#catalogue" className="skip-content">
        Skip to the prints
      </a>
      <AnnouncementBar />

      <SiteNav
        cartCount={store.cartCount}
        bumped={bumped}
        onOpenCart={() => setCartOpen(true)}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      {/* Primary header */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-ground/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-8 sm:py-3">
          {/* Mobile hamburger — in header on mobile, hidden on desktop (desktop nav is in SiteNav) */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-ground-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta md:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <Link
            to="/"
            aria-label={`${store.shop.name} home`}
            className="flex shrink-0 items-center rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-magenta"
          >
            <Logo className="h-10 w-[54px] sm:h-14 sm:w-[76px]" />
          </Link>

          <form
            role="search"
            className="relative flex flex-1 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              const el = document.getElementById("catalogue");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                // Reflect the query in the URL so the home page is deep-linkable
                // (e.g. /#catalogue?q=neon from other pages via the nav search).
                const params = new URLSearchParams(location.search);
                if (next.trim()) params.set("q", next);
                else params.delete("q");
                const search = params.toString();
                navigate(
                  { pathname: "/", search: search ? `?${search}` : "", hash: location.hash || "" },
                  { replace: true },
                );
              }}
              placeholder="Search prints…"
              aria-label="Search posters"
              className="w-full rounded-full border border-hairline bg-ground-soft py-2 pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-soft/70 transition focus:border-magenta focus:bg-ground focus:outline-none sm:py-2.5 sm:pl-10"
            />
          </form>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open selection, ${store.cartCount} items`}
            className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-ink/20 px-3 text-ink transition hover:border-yellow hover:bg-yellow hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta sm:gap-2 sm:px-4"
          >
            <CartIcon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
            <span className="hidden text-[13px] sm:block">Selection</span>
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium tabular-nums ${
                store.cartCount > 0
                  ? "bg-magenta text-ground"
                  : "bg-ground-soft text-ink-soft"
              } ${bumped ? "animate-pop" : ""}`}
            >
              {store.cartCount}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <PosterPlayground featured={featured} onOpen={setActive} />
      </main>

      <div className="funk-marquee" aria-hidden="true">
        <div>
          {[0, 1].map((i) => (
            <span key={i}>
              A little art. A lot of you. <b>✳</b> Make room for good vibes.{" "}
              <b>✳</b> Blank walls are boring. <b>✳</b>{" "}
            </span>
          ))}
        </div>
      </div>
      <HowItWorks />

      <main className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="catalog-heading">
          <div>
            <p>THE GOOD STUFF / YOUR NEXT WALL CRUSH</p>
            <h2>
              {content.copy?.catalogTitle || "Pick your personality"}
              <span>✳</span>
            </h2>
          </div>
          <span>Small prints. Big energy.</span>
        </div>
        {/* Filters bar */}
        <section
          id="catalogue"
          className="sticky top-[57px] z-20 -mx-4 bg-ground/92 px-4 py-3 backdrop-blur-md sm:top-[49px] sm:-mx-8 sm:px-8 sm:py-4"
        >
          <div className="flex items-center gap-3">
            <div className="rail -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-0.5">
              {shopCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`shrink-0 min-h-[44px] rounded-full border px-4 py-2 text-[13px] whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta ${
                    category === c
                      ? "border-yellow bg-yellow text-ink"
                      : "border-hairline text-ink-soft hover:border-ink/45 hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Open filters"
              className={`shrink-0 flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[13px] transition-all ${
                isFiltered
                  ? "border-magenta bg-magenta/10 text-magenta-deep"
                  : "border-hairline text-ink-soft hover:border-ink/30 hover:text-ink"
              }`}
            >
              <FilterIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {isFiltered && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-magenta text-[9px] font-semibold text-ground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative hidden shrink-0 items-center sm:flex">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort posters"
                className="appearance-none rounded-full border border-hairline bg-ground-soft py-2 pr-9 pl-4 text-[13px] text-ink transition focus:border-magenta focus:outline-none min-h-[44px]"
              >
                {(Object.keys(sortLabels) as Sort[]).map((k) => (
                  <option key={k} value={k}>
                    {sortLabels[k]}
                  </option>
                ))}
              </select>
              <ChevronIcon className="pointer-events-none absolute right-3 h-4 w-4 text-ink-soft" />
            </div>
          </div>

          <div className="relative mt-3 flex items-center sm:hidden">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort posters"
              className="w-full appearance-none rounded-full border border-hairline bg-ground-soft py-2 pr-9 pl-4 text-[13px] text-ink focus:border-magenta focus:outline-none min-h-[44px]"
            >
              {(Object.keys(sortLabels) as Sort[]).map((k) => (
                <option key={k} value={k}>
                  {sortLabels[k]}
                </option>
              ))}
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 h-4 w-4 text-ink-soft" />
          </div>
        </section>

        {/* Result count */}
        <div className="flex items-center gap-3 pt-5 pb-3">
          <p className="text-[12px] tracking-[0.16em] text-ink-soft uppercase">
            {visible.length} {visible.length === 1 ? "print" : "prints"}
            {category !== "All" && ` in ${category}`}
            {query.trim() && ` matching "${query.trim()}"`}
          </p>
          {(query.trim() || category !== "All" || isFiltered) && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 rounded-full border border-hairline bg-ground-soft px-3 py-1 text-[12px] text-ink-soft transition hover:border-magenta hover:text-magenta"
            >
              <CloseIcon className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Grid */}
        <section className="pb-20">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <FrameIcon className="h-10 w-10 text-ink/20" />
              <p className="font-display font-semibold tracking-[-0.02em] text-[20px] text-ink">
                Nothing under that name yet.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="min-h-[44px] text-[13px] text-magenta underline underline-offset-4 hover:text-magenta-deep"
              >
                Clear the filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((poster, i) => (
                <PosterCard
                  key={poster.id}
                  poster={poster}
                  index={i}
                  onOpen={() => setActive(poster)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <PhotoReviews />
      <ReviewsSection />
      <Footer />

      {/* Overlays */}
      {active && (
        <PosterDetail
          poster={active}
          onAdd={(size, qty) => {
            store.addToCart(active.id, size, qty);
            setToast(`${active.title} — ${size} × ${qty} added.`);
          }}
          onSetQty={(size, qty) => {
            store.setCartQty(active.id, size, qty);
            setToast(`${active.title} — ${size} updated to ${qty}.`);
          }}
          onClose={() => setActive(null)}
        />
      )}

      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onToast={setToast}
      />

      <FilterDrawer
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {toast && (
        <div
          role="status"
          className="animate-toast fixed bottom-6 left-1/2 z-[60] max-w-[92vw] rounded-full bg-yellow px-5 py-3 text-[13px] font-medium text-ink shadow-[0_16px_40px_-16px_rgba(8,2,14,0.9)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
