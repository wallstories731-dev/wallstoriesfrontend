import ArtworkImage from "./ArtworkImage"
import { useEffect, useRef, useState } from "react"
import { formatMoney, priceFor, type Poster, type SizeKey } from "../data/shop"
import { useStore } from "../context/StoreContext"
import { CheckIcon, HeartIcon, PlusIcon } from "./icons"

const BADGE_STYLES: Record<string, string> = {
  new: "bg-ink text-ground",
  bestseller: "bg-magenta text-ground",
  "few-left": "bg-yellow text-ink",
}
const BADGE_LABELS: Record<string, string> = {
  new: "New",
  bestseller: "Bestseller",
  "few-left": "Few left",
}

type SizePickerProps = {
  poster: Poster
  onClose: () => void
}

function SizePicker({ poster, onClose }: SizePickerProps) {
  const { addToCart, qtyOf } = useStore()
  const [added, setAdded] = useState<SizeKey | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClickOutside)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClickOutside)
    }
  }, [onClose])

  const handlePick = (size: SizeKey) => {
    addToCart(poster.id, size, 1)
    setAdded(size)
    setTimeout(onClose, 900)
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Pick a size for ${poster.title}`}
      className="absolute bottom-full right-0 z-30 mb-2 min-w-[160px] overflow-hidden rounded-[12px] border border-hairline bg-ground shadow-[0_8px_24px_-8px_rgba(8,2,14,0.3)]"
    >
      <div className="border-b border-hairline px-3 py-2">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Pick size</p>
      </div>
      <ul className="py-1">
        {poster.sizes.map((size) => {
          const inCart = qtyOf(poster.id, size)
          const isAdded = added === size
          return (
            <li key={size}>
              <button
                type="button"
                onClick={() => !isAdded && handlePick(size)}
                className="flex w-full min-h-[40px] items-center justify-between gap-3 px-3 py-1.5 text-left transition hover:bg-ground-soft"
              >
                <span className="text-[13px] font-medium text-ink">{size}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[12px] text-ink-soft">{formatMoney(priceFor(poster, size))}</span>
                  {isAdded ? (
                    <CheckIcon className="h-3.5 w-3.5 text-magenta" />
                  ) : inCart ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-magenta/15 text-[9px] font-semibold text-magenta-deep">{inCart}</span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type Props = {
  poster: Poster
  onOpen: () => void
  index: number
}

export default function PosterCard({ poster, onOpen, index }: Props) {
  const { qtyOf, toggleWishlist, isWishlisted, addToCart } = useStore()
  const [pickerOpen, setPickerOpen] = useState(false)

  const from = priceFor(poster, poster.sizes[0])
  const totalQty = poster.sizes.reduce((n, s) => n + qtyOf(poster.id, s), 0)
  const wishlisted = isWishlisted(poster.id)

  return (
    <article
      className="poster-card animate-rise group relative flex flex-col"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {/* ── Image card ────────────────────────────────────────────── */}
      <div className="poster-image-shell relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${poster.title}`}
        className="relative block w-full overflow-hidden rounded-[14px] shadow-[0_1px_2px_rgba(8,2,14,0.06)] transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_18px_36px_-18px_rgba(8,2,14,0.35)] focus-visible:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-magenta"
      >
        <span className="poster-frame block overflow-hidden">
          <span className="flex items-center justify-center" style={{ aspectRatio: "1 / 1.4142" }}>
            <ArtworkImage
              src={poster.image}
              alt={poster.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.045]"
            />
          </span>
        </span>

        {/* Badge */}
        {poster.badge && (
          <span className={`absolute top-4 left-4 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase shadow-sm ${BADGE_STYLES[poster.badge]}`}>
            {BADGE_LABELS[poster.badge]}
          </span>
        )}

        {/* In-cart count */}
        {totalQty > 0 && (
          <span className="absolute top-4 right-4 flex h-6 items-center gap-1 rounded-full bg-magenta px-2 text-[11px] font-medium tracking-wide text-ground shadow-sm">
            <CheckIcon className="h-3 w-3" />
            {totalQty}
          </span>
        )}

      </button>
        {/* Wishlist heart */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleWishlist(poster.id) }}
          aria-label={wishlisted ? `Remove ${poster.title} from wishlist` : `Add ${poster.title} to wishlist`}
          aria-pressed={wishlisted}
          className={`absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            wishlisted
              ? "bg-magenta text-ground shadow-sm"
              : "bg-ground/90 text-ink-soft opacity-100 backdrop-blur-sm hover:bg-magenta hover:text-ground"
          }`}
        >
          <HeartIcon className="h-4 w-4" filled={wishlisted} />
        </button>
      </div>

      {/* ── Card footer ───────────────────────────────────────────── */}
      <div className="relative mt-2 flex items-start justify-between gap-2 sm:mt-3 sm:gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left focus-visible:outline-none"
          tabIndex={-1}
          aria-hidden="true"
        >
          <h3 className="truncate font-display font-semibold tracking-[-0.02em] text-[14px] leading-tight text-ink sm:text-[17px]">
            {poster.title}
          </h3>
          <p className="mt-0.5 text-[10px] tracking-[0.12em] text-ink-soft uppercase sm:mt-1 sm:text-[11px]">
            <span className="text-magenta">{poster.code}</span> · {poster.sizes.length} {poster.sizes.length === 1 ? "size" : "sizes"}
          </p>
          <p className="mt-1 text-[12px] text-ink-soft sm:text-[13px]">
            from <span className="font-medium text-ink">{formatMoney(from)}</span>
          </p>
        </button>

        {/* "+" / checkmark with size picker */}
        <div className="relative mt-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (poster.sizes.length === 1) {
                addToCart(poster.id, poster.sizes[0], 1)
              } else {
                setPickerOpen((v) => !v)
              }
            }}
            aria-label={totalQty > 0 ? `${poster.title} in selection — pick another size` : `Add ${poster.title}`}
            aria-expanded={pickerOpen}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta ${
              totalQty > 0
                ? "border-magenta bg-magenta text-ground"
                : "border-hairline text-ink-soft hover:border-magenta hover:bg-magenta hover:text-ground active:scale-90"
            }`}
          >
            {totalQty > 0 ? (
              <CheckIcon key="on" className="h-4 w-4 animate-pop" />
            ) : (
              <PlusIcon className="h-4 w-4" />
            )}
          </button>

          {pickerOpen && (
            <SizePicker
              poster={poster}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </div>
    </article>
  )
}
