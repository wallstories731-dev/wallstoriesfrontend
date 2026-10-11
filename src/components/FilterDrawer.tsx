import useModal from "../hooks/useModal"
import { CloseIcon, CheckIcon } from "./icons"
import { useStore } from "../context/StoreContext"
import { priceFor, type SizeKey } from "../data/shop"

export type FilterState = {
  sizes: SizeKey[]
  maxPrice: number
  orientation: "all" | "portrait" | "square"
}

export const DEFAULT_FILTERS: FilterState = {
  sizes: [],
  maxPrice: Number.POSITIVE_INFINITY,
  orientation: "all",
}

const ALL_SIZES: SizeKey[] = ["A4", "A3", "A2", "12×18", "18×24"]

type Props = {
  open: boolean
  filters: FilterState
  onChange: (f: FilterState) => void
  onClose: () => void
  onReset: () => void
}

export default function FilterDrawer({ open, filters, onChange, onClose, onReset }: Props) {
  const {posters}=useStore()
  const priceCeiling=Math.max(2000,...posters.filter(p=>p.status!=="draft").flatMap(p=>p.sizes.map(s=>priceFor(p,s))))
  const rangeMax=Math.ceil(priceCeiling/50)*50
  const dialogRef = useModal<HTMLElement>(open, onClose)

  if (!open) return null

  const toggleSize = (s: SizeKey) =>
    onChange({
      ...filters,
      sizes: filters.sizes.includes(s)
        ? filters.sizes.filter((x) => x !== s)
        : [...filters.sizes, s],
    })

  const isDefault =
    filters.sizes.length === 0 &&
    filters.maxPrice === DEFAULT_FILTERS.maxPrice &&
    filters.orientation === "all"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter posters"
        className="animate-slide-in relative flex h-full w-full max-w-[360px] flex-col bg-ground shadow-[-16px_0_48px_-20px_rgba(8,2,14,0.5)]"
      >
        <header className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="font-display font-semibold text-[18px] text-ink tracking-tight">Filters</h2>
          <div className="flex items-center gap-2">
            {!isDefault && (
              <button
                type="button"
                onClick={onReset}
                className="rounded-full border border-hairline px-3 py-1 text-[12px] text-ink-soft transition hover:border-magenta hover:text-magenta"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-ground-soft"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
          {/* Size */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">Size</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((s) => {
                const active = filters.sizes.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    aria-pressed={active}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-all ${
                      active
                        ? "border-magenta bg-magenta/10 text-magenta-deep"
                        : "border-hairline text-ink-soft hover:border-ink/30 hover:text-ink"
                    }`}
                  >
                    {active && <CheckIcon className="h-3.5 w-3.5" />}
                    {s}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Price */}
          <section>
            <h3 className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">Starting price limit</h3>
            <p className="mb-3 text-[12px] text-ink-soft">
              <span className="font-medium text-ink">{Number.isFinite(filters.maxPrice) ? "Up to ₹"+filters.maxPrice : "Any price"}</span>
            </p>
            <input
              type="range"
              aria-label="Maximum starting price"
              min={0}
              max={rangeMax}
              step={50}
              value={Number.isFinite(filters.maxPrice) ? Math.min(filters.maxPrice,rangeMax) : rangeMax}
              onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value)===rangeMax ? Number.POSITIVE_INFINITY : Number(e.target.value) })}
              className="w-full accent-magenta"
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
              <span>₹0</span><span>Any price</span>
            </div>
          </section>

          {/* Orientation */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">Orientation</h3>
            <div className="flex gap-2">
              {(["all", "portrait", "square"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => onChange({ ...filters, orientation: o })}
                  aria-pressed={filters.orientation === o}
                  className={`flex min-h-[44px] flex-1 items-center justify-center rounded-full border text-[13px] font-medium capitalize transition-all ${
                    filters.orientation === o
                      ? "border-yellow bg-yellow text-ink"
                      : "border-hairline text-ink-soft hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-hairline p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full min-h-[48px] items-center justify-center rounded-full bg-magenta text-[14px] font-medium text-ground shadow-[0_8px_20px_-8px_rgba(229,21,127,0.8)] transition hover:bg-magenta-deep"
          >
            Show results
          </button>
        </div>
      </aside>
    </div>
  )
}
