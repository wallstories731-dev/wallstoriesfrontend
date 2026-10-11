import { loadAdminSettings } from "../api/settings";
import useModal from "../hooks/useModal";
import ArtworkImage from "../components/ArtworkImage";
import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useStore } from "../context/StoreContext";
import {
  formatMoney,
  priceFor,
  getPosterGallery,
  estimateDelivery,
  SIZE_DIMS,
  type SizeKey,
  type Poster,
} from "../data/shop";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import Logo from "../components/Logo";
import {
  CartIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  CloseIcon,
  ChevronIcon,
  ZoomInIcon,
  ShareIcon,
  WhatsAppIcon,
  CopyIcon,
  ArrowLeftIcon,
  MapPinIcon,
  RulerIcon,
  InstagramIcon,
} from "../components/icons";
import CartPanel from "../components/CartPanel";

// ─── Zoom lightbox ────────────────────────────────────────────────────────────

function ZoomLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const dialogRef = useModal(true, onClose);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Artwork zoom"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close zoom"
        className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-ground/20 text-ground transition hover:bg-ground/30"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
      <ArtworkImage
        src={src.replace("w=900", "w=1800").replace("h=1200", "h=2400")}
        alt={alt}
        className="max-h-[92vh] max-w-[92vw] rounded-[8px] object-contain shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

const GALLERY_LABELS = ["Print", "Detail 2", "Detail 3"];

function Gallery({ poster }: { poster: Poster }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const images = getPosterGallery(poster);
  const touchStart = useRef<number | null>(null);

  const next = () => setIdx((i) => (i + 1) % images.length);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <div className="group relative overflow-hidden rounded-[14px] shadow-[0_2px_6px_rgba(8,2,14,0.08)]">
          <div
            className="poster-frame relative overflow-hidden shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
            onTouchStart={(e) => {
              touchStart.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStart.current === null) return;
              const dx = e.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
              touchStart.current = null;
            }}
          >
            {images.map((src, i) => (
              <ArtworkImage
                key={i}
                src={src}
                alt={`${poster.alt} — ${GALLERY_LABELS[i]}`}
                className={`w-full object-contain transition-opacity duration-300 ${
                  i === idx
                    ? "relative opacity-100"
                    : "pointer-events-none absolute inset-0 h-full opacity-0"
                }`}
              />
            ))}

            {/* Prev/next */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ground/85 text-ink shadow-sm backdrop-blur transition hover:bg-magenta hover:text-ground opacity-100"
                >
                  <div className="rotate-90">
                    <ChevronIcon className="h-4 w-4" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ground/85 text-ink shadow-sm backdrop-blur transition hover:bg-magenta hover:text-ground opacity-100"
                >
                  <div className="-rotate-90">
                    <ChevronIcon className="h-4 w-4" />
                  </div>
                </button>
              </>
            )}

            {/* Zoom button */}
            <button
              type="button"
              onClick={() => setZoom(images[idx])}
              aria-label="Zoom image"
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-ground/80 text-ink-soft shadow-sm backdrop-blur transition hover:bg-magenta hover:text-ground opacity-100"
            >
              <ZoomInIcon className="h-4 w-4" />
            </button>

            {/* Label chip */}
            <span className="absolute top-3 left-3 rounded-full bg-ground/85 px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] text-ink backdrop-blur uppercase">
              {GALLERY_LABELS[idx]}
            </span>
          </div>

          {/* Dot nav */}
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`View ${GALLERY_LABELS[i]}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx
                    ? "w-5 bg-magenta"
                    : "w-1.5 bg-ink/25 hover:bg-ink/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={GALLERY_LABELS[i]}
              aria-pressed={i === idx}
              className={`flex-1 overflow-hidden rounded-[8px] border-2 transition-all ${
                i === idx
                  ? "border-magenta shadow-sm"
                  : "border-transparent hover:border-hairline"
              }`}
            >
              <ArtworkImage
                src={src}
                alt={GALLERY_LABELS[i]}
                className="poster-frame poster-frame-mini w-full rounded-[4px] object-cover"
                style={{ aspectRatio: "1 / 1.4" }}
              />
            </button>
          ))}
        </div>
      </div>

      {zoom && (
        <ZoomLightbox
          src={zoom}
          alt={poster.alt}
          onClose={() => setZoom(null)}
        />
      )}
    </>
  );
}

// ─── Size guide modal ─────────────────────────────────────────────────────────

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useModal(true, onClose);

  const rows: { size: SizeKey; cm: string; inches: string; bestFor: string }[] =
    [
      {
        size: "A4",
        cm: "21 × 29.7 cm",
        inches: '8.3 × 11.7"',
        bestFor: "Desk, shelf, small wall cluster",
      },
      {
        size: "A3",
        cm: "29.7 × 42 cm",
        inches: '11.7 × 16.5"',
        bestFor: "Bedside, narrow hallway wall",
      },
      {
        size: "A2",
        cm: "42 × 59.4 cm",
        inches: '16.5 × 23.4"',
        bestFor: "Feature wall, living room",
      },
      {
        size: "12×18",
        cm: "30.5 × 45.7 cm",
        inches: '12 × 18"',
        bestFor: "Portrait orientation focal point",
      },
      {
        size: "18×24",
        cm: "45.7 × 61 cm",
        inches: '18 × 24"',
        bestFor: "Large statement piece",
      },
    ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="animate-fade absolute inset-0 bg-ink/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Size guide"
        className="animate-rise relative w-full max-w-lg overflow-hidden rounded-[16px] bg-ground shadow-[0_30px_80px_-20px_rgba(8,2,14,0.6)]"
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2">
            <RulerIcon className="h-4 w-4 text-magenta" />
            <h2 className="font-display font-semibold text-[18px] text-ink tracking-tight">
              Size guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-hairline bg-ground-soft">
                <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
                  Size
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
                  Centimetres
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
                  Inches
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase hidden sm:table-cell">
                  Best for
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.size}
                  className={i % 2 === 0 ? "" : "bg-ground-soft/50"}
                >
                  <td className="px-5 py-3 font-semibold text-ink">{r.size}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.cm}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.inches}</td>
                  <td className="px-5 py-3 text-ink-soft hidden sm:table-cell">
                    {r.bestFor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-hairline px-5 py-4">
          <p className="text-[12px] text-ink-soft">
            All prints are portrait orientation unless marked otherwise. Printed
            on 300 GSM matte art paper with archival inks.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-[52px] items-center justify-between gap-4 py-4 text-left text-[14px] font-medium text-ink transition hover:text-magenta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
      >
        {title}
        <div
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <ChevronIcon className="h-4 w-4 text-ink-soft" />
        </div>
      </button>
      {open && (
        <div className="pb-5 text-[13px] leading-relaxed text-ink-soft">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Pincode checker ──────────────────────────────────────────────────────────

function PincodeChecker() {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<
    "idle" | "checking" | "found" | "invalid"
  >("idle");
  const [estimate, setEstimate] = useState<string | null>(null);

  const check = () => {
    if (!/^\d{6}$/.test(pin)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    setTimeout(() => {
      const result = estimateDelivery(pin);
      setEstimate(result);
      setStatus("found");
    }, 700);
  };

  return (
    <div className="rounded-[12px] border border-hairline bg-ground-soft/60 p-4">
      <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
        <MapPinIcon className="h-3.5 w-3.5 text-magenta/70" />
        Check delivery to your pincode
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="e.g. 400001"
          aria-label="Enter 6-digit pincode"
          className="flex-1 rounded-[8px] border border-hairline bg-ground px-3 py-2 text-[13px] text-ink placeholder:text-ink-soft/50 transition focus:border-magenta focus:outline-none"
        />
        <button
          type="button"
          onClick={check}
          disabled={status === "checking"}
          className="flex min-h-[40px] items-center gap-1.5 rounded-[8px] bg-ink px-4 text-[13px] font-medium text-ground transition hover:bg-magenta disabled:opacity-50"
        >
          {status === "checking" ? "…" : "Check"}
        </button>
      </div>
      {status === "found" && estimate && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft">
          <CheckIcon className="h-3.5 w-3.5 text-success shrink-0" />
          Estimated delivery:{" "}
          <span className="font-medium text-ink">{estimate}</span> after
          dispatch
        </p>
      )}
      {status === "invalid" && (
        <p className="mt-2 text-[12px] text-danger">
          Please enter a valid 6-digit pincode.
        </p>
      )}
    </div>
  );
}

// ─── Pairs well with carousel ────────────────────────────────────────────────

function PairsWellWith({
  current,
  onOpen,
}: {
  current: Poster;
  onOpen: (p: Poster) => void;
}) {
  const store = useStore();
  const peers = useMemo(() => {
    const same = store.posters.filter(
      (p) => p.category === current.category && p.id !== current.id,
    );
    const others = store.posters.filter(
      (p) => p.category !== current.category && p.id !== current.id,
    );
    return [...same, ...others].slice(0, 6);
  }, [store.posters, current]);

  if (peers.length === 0) return null;

  return (
    <section className="border-t border-hairline py-10 sm:py-14">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <p className="mb-6 text-[11px] tracking-[0.28em] text-magenta uppercase">
          Pairs well with
        </p>
        <div className="rail flex gap-4 overflow-x-auto pb-2">
          {peers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p)}
              className="group shrink-0 w-[160px] overflow-hidden rounded-[12px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(8,2,14,0.35)] sm:w-[200px]"
            >
              <div className="poster-frame overflow-hidden">
                <ArtworkImage
                  src={p.image}
                  alt={p.alt}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ aspectRatio: "1 / 1.4142" }}
                />
              </div>
              <div className="px-3 py-3 text-left">
                <p className="truncate text-[12px] font-medium text-ink">
                  {p.title}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  from {formatMoney(priceFor(p, p.sizes[0]))}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton({ poster }: { poster: Poster }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `Check out "${poster.title}" on WALLstories — ${url}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: poster.title, url });
        return;
      } catch {
        /* fallback to popover */
      }
    }
    setOpen((v) => !v);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share this print"
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-hairline px-4 text-[13px] text-ink-soft transition hover:border-ink/30 hover:text-ink"
      >
        <ShareIcon className="h-4 w-4" />
        Share
      </button>

      {open && (
        <div className="animate-rise absolute bottom-full right-0 mb-2 min-w-[200px] overflow-hidden rounded-[12px] border border-hairline bg-ground shadow-[0_8px_24px_-8px_rgba(8,2,14,0.3)]">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center gap-3 px-4 py-3 text-[13px] text-ink transition hover:bg-ground-soft"
          >
            <WhatsAppIcon className="h-5 w-5 text-success" />
            Share on WhatsApp
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full min-h-[48px] items-center gap-3 border-t border-hairline px-4 py-3 text-[13px] text-ink transition hover:bg-ground-soft"
          >
            {copied ? (
              <CheckIcon className="h-5 w-5 text-magenta" />
            ) : (
              <CopyIcon className="h-5 w-5 text-ink-soft" />
            )}
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PrintPage() {
  const { sku } = useParams<{ sku: string }>();
  const store = useStore();

  const poster = store.posters.find(
    (p) => p.id === sku && p.status !== "draft",
  );

  const [size, setSize] = useState<SizeKey | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeGuide, setSizeGuide] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Peer popup state (pairs well with)
  const [peerActive, setPeerActive] = useState<Poster | null>(null);

  const activeSize = size ?? poster?.sizes[0] ?? "A4";

  useEffect(() => {
    if (poster) {
      setSize(poster.sizes[0]);
      setQty(Math.max(1, store.qtyOf(poster.id, poster.sizes[0])));
      setPeerActive(null);
    }
  }, [poster]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!poster) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground px-4 text-center">
        <h1 className="font-display font-semibold text-[24px] text-ink">
          Print not found.
        </h1>
        <Link
          to="/"
          className="text-[14px] text-magenta underline underline-offset-4 hover:text-magenta-deep"
        >
          Browse all prints
        </Link>
      </div>
    );
  }

  const unit = priceFor(poster, activeSize);
  const inCart = store.qtyOf(poster.id, activeSize);

  const handleAdd = () => {
    if (inCart) {
      store.setCartQty(poster.id, activeSize, qty);
      setToast(`Updated: ${poster.title} — ${activeSize} × ${qty}`);
    } else {
      store.addToCart(poster.id, activeSize, qty);
      setToast(`Added: ${poster.title} — ${activeSize}`);
    }
  };

  const igUrl = `https://ig.me/m/${store.shop.instagramUsername}`;

  return (
    <div className="min-h-screen bg-ground">
      <AnnouncementBar />
      <SiteNav
        cartCount={store.cartCount}
        bumped={false}
        onOpenCart={() => setCartOpen(true)}
        query=""
        onQueryChange={() => {}}
        SearchSlot={null}
        CartSlot={null}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-ground/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-8">
          <Link
            to="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
            aria-label="Back to catalogue"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>

          <nav
            aria-label="Breadcrumb"
            className="flex-1 text-[12px] text-ink-soft"
          >
            <ol className="flex items-center gap-1">
              <li>
                <Link to="/" className="hover:text-magenta transition-colors">
                  Shop
                </Link>
              </li>
              <li aria-hidden="true" className="mx-1 text-hairline">
                /
              </li>
              <li className="text-ink-soft">{poster.category}</li>
              <li aria-hidden="true" className="mx-1 text-hairline">
                /
              </li>
              <li className="truncate font-medium text-ink">{poster.title}</li>
            </ol>
          </nav>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open selection, ${store.cartCount} items`}
            className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-ink/20 px-3 text-ink transition hover:border-yellow hover:bg-yellow sm:gap-2 sm:px-4"
          >
            <CartIcon className="h-4 w-4" />
            <span className="hidden text-[13px] sm:block">Selection</span>
            {store.cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-magenta px-1 text-[11px] font-medium text-ground">
                {store.cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-8 sm:py-12">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: Gallery */}
          <div className="md:sticky md:top-[73px] md:self-start">
            <Gallery key={poster.id} poster={poster} />
          </div>

          {/* Right: Details */}
          <div className="flex flex-col gap-6">
            {/* Title block */}
            <div>
              <p className="flex items-center gap-2.5 text-[11px] tracking-[0.2em] text-magenta uppercase">
                {poster.category}
                <span className="rounded-full bg-ground-soft px-2.5 py-1 tracking-[0.14em] text-ink">
                  {poster.code}
                </span>
              </p>
              <h1
                className="mt-2 tracking-[-0.025em] leading-[1.1] text-ink text-[28px] sm:text-[36px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {poster.title}
              </h1>
            </div>

            <div className="h-px bg-hairline" />

            {/* Size picker */}
            <fieldset>
              <div className="mb-3 flex items-center justify-between">
                <legend className="text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
                  Size
                </legend>
                <button
                  type="button"
                  onClick={() => setSizeGuide(true)}
                  className="flex items-center gap-1 text-[11px] text-magenta underline underline-offset-4 hover:text-magenta-deep"
                >
                  <RulerIcon className="h-3 w-3" />
                  Size guide
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {poster.sizes.map((s) => {
                  const dims = SIZE_DIMS[s];
                  const p = priceFor(poster, s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSize(s);
                        setQty(Math.max(1, store.qtyOf(poster.id, s) || 1));
                      }}
                      aria-pressed={activeSize === s}
                      className={`flex flex-col items-center gap-0.5 rounded-[10px] border px-3.5 py-2.5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta ${
                        activeSize === s
                          ? "border-yellow bg-yellow text-ink shadow-sm"
                          : "border-hairline text-ink-soft hover:border-ink/45 hover:text-ink"
                      }`}
                    >
                      <span className="text-[14px] font-semibold">{s}</span>
                      <span className="text-[10px] leading-snug opacity-75">
                        {dims.cm}
                      </span>
                      <span className="text-[10px] leading-snug opacity-60">
                        {dims.inches}
                      </span>
                      <span className="mt-1 text-[12px] font-medium">
                        {formatMoney(p)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Price + qty */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.18em] text-ink-soft uppercase">
                  Total
                </p>
                <p
                  className="mt-1 tracking-[-0.025em] text-[30px] leading-none text-ink"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                >
                  {formatMoney(unit * qty)}
                </p>
                {qty > 1 && (
                  <p className="text-[12px] text-ink-soft">
                    {formatMoney(unit)} each
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-full border border-hairline p-1">
                <button
                  type="button"
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft hover:text-ink"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-[15px] tabular-nums font-medium text-ink">
                  {qty}
                </span>
                <button
                  type="button"
                  disabled={qty >= 20}
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft hover:text-ink"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleAdd}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-magenta px-6 text-[14px] font-medium tracking-wide text-ground shadow-[0_10px_24px_-12px_rgba(229,21,127,0.9)] transition-all hover:bg-magenta-deep active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
            >
              {inCart ? (
                <>
                  <CheckIcon className="h-4 w-4" /> Update selection —{" "}
                  {formatMoney(unit * qty)}
                </>
              ) : (
                <>Add to selection — {formatMoney(unit * qty)}</>
              )}
            </button>

            {inCart > 0 && (
              <p className="mt-[-8px] text-center text-[12px] text-ink-soft">
                {inCart} × {activeSize} already in your selection
              </p>
            )}

            {/* Pincode checker */}
            <PincodeChecker />

            {/* Send on Instagram CTA */}
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-hairline bg-ground-soft px-5 text-[13px] font-medium text-ink transition hover:border-ink/30 hover:bg-ground"
            >
              <InstagramIcon className="h-4 w-4 text-magenta" />
              Order via Instagram DM
            </a>

            {/* Share */}
            <div className="flex items-center justify-end">
              <ShareButton poster={poster} />
            </div>

            <div className="h-px bg-hairline" />

            {/* Accordions */}
            <div>
              <Accordion title="About this print" defaultOpen>
                <p>{poster.description}</p>
                <p className="mt-3">
                  Catalogue code{" "}
                  <span className="font-medium text-ink">{poster.code}</span> ·
                  Available in {poster.sizes.length} sizes from A4 to 18×24
                  inches.
                </p>
              </Accordion>

              <Accordion title="Paper quality">
                <p>
                  Printed on{" "}
                  <strong className="text-ink">300 GSM matte art paper</strong>{" "}
                  using archival pigment inks. The matte surface eliminates
                  glare and gives colours a velvety depth that gloss paper
                  can&rsquo;t match.
                </p>
                <p className="mt-3">
                  Estimated lightfastness of 75+ years under normal indoor
                  display conditions. The paper is acid-free and lignin-free, so
                  it won&rsquo;t yellow or become brittle over time.
                </p>
              </Accordion>

              <Accordion title="Shipping & returns">
                <p>
                  All prints are made to order and dispatched within{" "}
                  <strong className="text-ink">1–2 business days</strong> of
                  payment confirmation.{" "}
                  <strong className="text-ink">
                    {loadAdminSettings().shippingDaysText}
                  </strong>
                  .
                </p>
                <p className="mt-3">
                  Prints are rolled in a protective sleeve and shipped in a
                  rigid triangular tube. If your print arrives damaged, send a
                  photo within 48 hours and I&rsquo;ll dispatch a replacement at
                  no charge.
                </p>
                <p className="mt-3 text-[12px]">
                  <em>
                    Note: because each print is made to order, we can&rsquo;t
                    accept returns for change of mind. Please check sizes
                    carefully before ordering.
                  </em>
                </p>
              </Accordion>
            </div>
          </div>
        </div>
      </main>

      {/* Pairs well with */}
      <PairsWellWith
        current={poster}
        onOpen={(p) => {
          // Navigate to that print's page instead of inline popup
          window.location.href = `/print/${p.id}`;
        }}
      />

      {/* Footer */}
      <footer className="border-t border-hairline py-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 text-[12px] text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/" className="hover:text-magenta transition-colors">
            <Logo className="h-12 w-[65px]" />
          </Link>
          <span>
            @{store.shop.instagramUsername} · Printed to order · Ships across
            India
          </span>
        </div>
      </footer>

      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onToast={setToast}
      />

      {sizeGuide && <SizeGuideModal onClose={() => setSizeGuide(false)} />}

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
