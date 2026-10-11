import ArtworkImage from "./ArtworkImage"
import useModal from "../hooks/useModal"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { estimateDelivery, formatMoney, instagramDmUrl, priceFor, SIZE_DIMS, type Poster, type SizeKey } from "../data/shop"
import { useStore } from "../context/StoreContext"
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, ChevronIcon, ExternalLinkIcon } from "./icons"

type Props = {
  poster: Poster
  onAdd: (size: SizeKey, qty: number) => void
  onSetQty: (size: SizeKey, qty: number) => void
  onClose: () => void
}

export default function PosterDetail({ poster, onAdd, onSetQty, onClose }: Props) {
  const { qtyOf } = useStore()
  const [size, setSize] = useState<SizeKey>(poster.sizes[0])
  const [qty, setQty] = useState(1)
  const [imgIndex, setImgIndex] = useState(0)
  const [pincode, setPincode] = useState("")
  const deliveryEst = estimateDelivery(pincode)

  const inCart = qtyOf(poster.id, size)
  const unit = priceFor(poster, size)

  const carouselImages =
    poster.carouselImages && poster.carouselImages.length > 0
      ? [poster.image, ...poster.carouselImages.filter((u) => u !== poster.image)]
      : [poster.image]

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIndex((i) => (i + 1) % carouselImages.length)
  }

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIndex((i) => (i - 1 + carouselImages.length) % carouselImages.length)
  }

  // Touch swipe support for carousel
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) setImgIndex((i) => (i + 1) % carouselImages.length)
      else setImgIndex((i) => (i - 1 + carouselImages.length) % carouselImages.length)
    }
    touchStartX.current = null
  }

  const dialogRef = useModal(true, onClose)

  useEffect(() => {
    setQty(Math.max(1, qtyOf(poster.id, size)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, poster])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="animate-fade absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={poster.title}
        className="animate-rise rail relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[24px] bg-ground shadow-[0_-10px_60px_rgba(8,2,14,0.3)] sm:rounded-[16px] sm:shadow-[0_30px_80px_-30px_rgba(8,2,14,0.55)]"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-ink/20" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ground/85 text-ink shadow-sm backdrop-blur transition hover:bg-magenta hover:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta sm:top-4 sm:right-4"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="grid gap-0 md:grid-cols-[1.05fr_1fr]">
          {/* Image carousel */}
          <div className="relative flex flex-col items-center justify-center">
            <div
              className="poster-frame relative w-full overflow-hidden shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)]"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {carouselImages.map((src, i) => (
                <ArtworkImage
                  key={i}
                  src={src}
                  alt={`${poster.alt} - View ${i + 1}`}
                  className={`w-full object-contain transition-opacity duration-300 ${
                    i === imgIndex
                      ? "opacity-100 relative"
                      : "opacity-0 pointer-events-none absolute inset-0 h-full"
                  }`}
                />
              ))}

              {carouselImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImg}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ground/85 text-ink shadow-sm backdrop-blur transition hover:bg-magenta hover:text-ground sm:h-8 sm:w-8 "
                    aria-label="Previous image"
                  >
                    <div className="rotate-90"><ChevronIcon className="h-4 w-4" /></div>
                  </button>
                  <button
                    type="button"
                    onClick={nextImg}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ground/85 text-ink shadow-sm backdrop-blur transition hover:bg-magenta hover:text-ground sm:h-8 sm:w-8 "
                    aria-label="Next image"
                  >
                    <div className="-rotate-90"><ChevronIcon className="h-4 w-4" /></div>
                  </button>
                </>
              )}
            </div>

            {carouselImages.length > 1 && (
              <div className="mt-3 flex gap-1.5">
                {carouselImages.map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === imgIndex ? "w-4 bg-magenta" : "w-1.5 bg-ink/30 hover:bg-ink/50"
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-8 md:p-10">
            <div>
              <p className="flex items-center gap-2.5 text-[11px] tracking-[0.2em] text-magenta uppercase">
                {poster.category}
                <span className="rounded-full bg-ground-soft px-2.5 py-1 tracking-[0.14em] text-ink">
                  {poster.code}
                </span>
              </p>
              <h2 className="mt-2 font-display font-semibold tracking-[-0.02em] text-[26px] leading-[1.1] text-ink sm:text-[32px] md:text-[36px]">
                {poster.title}
              </h2>
              <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                {poster.description}
              </p>
            </div>

            <div className="h-px bg-hairline" />

            <fieldset>
              <legend className="text-[11px] tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
                Size
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {poster.sizes.map((s) => {
                  const dims = SIZE_DIMS[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                      className={`flex flex-col items-start rounded-[10px] border px-3 py-2 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)] ${
                        size === s
                          ? "border-[var(--color-yellow)] bg-[var(--color-yellow)] text-[var(--color-ink)]"
                          : "border-[var(--color-hairline)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)]/45 hover:text-[var(--color-ink)]"
                      }`}
                    >
                      <span className="text-[13px] font-semibold leading-tight">{s}</span>
                      <span className="mt-0.5 text-[10px] leading-tight opacity-75">
                        {dims.cm}
                        <br />
                        {dims.inches}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* Pincode delivery estimate */}
            <div>
              <p className="text-[11px] tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">Delivery estimate</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  aria-label="Delivery pincode"
                  placeholder="Enter 6-digit pincode"
                  className="flex-1 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-ground-soft)] px-3.5 py-2 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/50 transition focus:border-[var(--color-magenta)] focus:outline-none"
                />
              </div>
              {deliveryEst ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--color-success)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
                  Estimated delivery: {deliveryEst}
                </p>
              ) : pincode.length === 6 ? (
                <p className="mt-1.5 text-[12px] text-[var(--color-ink-soft)]">Contact us for delivery timeline to this area.</p>
              ) : null}
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.18em] text-ink-soft uppercase">Price</p>
                <p className="mt-1 font-display font-semibold tracking-[-0.02em] text-[26px] leading-none text-ink sm:text-[28px]">
                  {formatMoney(unit)}
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-full border border-hairline p-1">
                <Stepper label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <MinusIcon className="h-4 w-4" />
                </Stepper>
                <span className="w-8 text-center text-[15px] tabular-nums">{qty}</span>
                <Stepper label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20}>
                  <PlusIcon className="h-4 w-4" />
                </Stepper>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (inCart ? onSetQty(size, qty) : onAdd(size, qty))}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-magenta px-6 py-4 text-[14px] font-medium tracking-wide text-ground shadow-[0_10px_24px_-12px_rgba(229,21,127,0.9)] transition-all duration-200 hover:bg-magenta-deep active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
            >
              {inCart ? (
                <><CheckIcon className="h-4 w-4" /> Added ✓ — update to {qty}</>
              ) : (
                <>Add to selection — {formatMoney(unit * qty)}</>
              )}
            </button>

            <p className="text-center text-[12px] text-ink-soft">
              {inCart
                ? `${inCart} × ${size} already in your selection.`
                : "Nothing is charged here — you send your list to the seller."}
            </p>

            <Link
              to={`/print/${poster.id}`}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--color-ink-soft)] underline underline-offset-4 transition hover:text-[var(--color-magenta)]"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              Open full product page
            </Link>

            {/* Instagram doubt link */}
            <a
              href={instagramDmUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-4 py-2.5 text-[12px] text-[var(--color-ink-soft)] transition hover:border-[var(--color-magenta)] hover:text-[var(--color-magenta)]"
            >
              Have a doubt? Ask on Instagram →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stepper({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft hover:text-ink active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
    >
      {children}
    </button>
  )
}
