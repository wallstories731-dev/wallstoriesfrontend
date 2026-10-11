import ArtworkImage from "../components/ArtworkImage"
import { useState, useEffect } from "react"
import AnnouncementBar from "../components/AnnouncementBar"
import SiteNav from "../components/SiteNav"
import Footer from "../components/Footer"
import CartPanel from "../components/CartPanel"
import { useStore } from "../context/StoreContext"
import { useOffers } from "../context/OffersContext"
import { formatMoney, priceFor } from "../data/shop"
import type { SizeKey } from "../data/shop"

// 6 curated bundles using real poster IDs
const SETS = [
  {
    id: "night-city",
    name: "Night City",
    tagline: "For walls that hold their breath after dark",
    description: "Three prints that share the same grammar: sodium light, wet surfaces, and the particular silence of a city at 2 AM.",
    posterIds: ["neon-tokyo", "crossing", "quiet-planet"],
    cover: "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=900&h=1200&fit=crop&auto=format&q=80",
  },
  {
    id: "desert-light",
    name: "Desert Light",
    tagline: "Warmth, scale, and silence",
    description: "Earth tones in dialogue — the sweeping and the still. These three read as one piece when hung together.",
    posterIds: ["golden-fields", "dune-shadow", "fog-pines"],
    cover: "https://images.unsplash.com/photo-1750859876218-7c66b60afa02?w=900&h=1200&fit=crop&auto=format&q=80",
  },
  {
    id: "analog-soul",
    name: "Analog Soul",
    tagline: "Rooms that play records",
    description: "Vinyl lovers, this one is for you. Side B and First Press pair perfectly — add the Lubitel for a collector corner.",
    posterIds: ["first-press", "side-b", "lubitel"],
    cover: "https://images.unsplash.com/photo-1485726696757-76885c99f0f5?w=900&h=1200&fit=crop&auto=format&q=80",
  },
  {
    id: "abstract-trio",
    name: "Abstract Trio",
    tagline: "Shape, colour, and tension",
    description: "Warm against cool against neutral. Hang all three in a row and you have a coherent gallery wall that surprises.",
    posterIds: ["soft-machine", "blue-torsion", "quiet-planet"],
    cover: "https://images.unsplash.com/photo-1738937444519-f0a7084c955e?w=900&h=1200&fit=crop&auto=format&q=80",
  },
  {
    id: "botanical-calm",
    name: "Botanical Calm",
    tagline: "Plants, light, still things",
    description: "Slow prints for slow rooms. These work in a bedroom, a study, or anywhere you want the wall to quiet down.",
    posterIds: ["monstera-study", "fog-pines", "golden-fields"],
    cover: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=900&h=1200&fit=crop&auto=format&q=80",
  },
  {
    id: "collector-corner",
    name: "Collector's Corner",
    tagline: "Shelves, courts, and things with character",
    description: "For the desk corner or the alcove — each print has the quality of an object rather than a decoration.",
    posterIds: ["shelf-life", "court-light", "lubitel"],
    cover: "https://images.unsplash.com/photo-1784316395297-c1f0b835242b?w=900&h=1200&fit=crop&auto=format&q=80",
  },
]

const DEFAULT_SIZE: SizeKey = "A3"

function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
}
function CartIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
}

function SetCard({ setDef, onAddAll }: {
  setDef: typeof SETS[0]
  onAddAll: (ids: string[], size: SizeKey) => void
}) {
  const { posters } = useStore()
  const { config } = useOffers()
  const { bundleRule } = config
  const [size, setSize] = useState<SizeKey>(DEFAULT_SIZE)
  const [added, setAdded] = useState(false)

  const setPosters = setDef.posterIds
    .map((id) => posters.find((p) => p.id === id))
    .filter(p=>p && p.status!=="draft") as typeof posters

  const subtotal = setPosters.reduce((n, p) => n + priceFor(p, size), 0)
  const discount = bundleRule.enabled && setPosters.length >= bundleRule.minItems
    ? subtotal * (bundleRule.discountPercent / 100)
    : 0
  const total = subtotal

  const allSizes = setPosters.reduce<SizeKey[]>((acc, p) => {
    return acc.filter((s) => p.sizes.includes(s))
  }, setPosters[0]?.sizes ?? [])

  const availableSize=allSizes.includes(size) ? size : allSizes[0]
  useEffect(()=>{if(availableSize && availableSize!==size)setSize(availableSize)},[availableSize,size])
  const handleAdd = () => {
    if(!availableSize || !setPosters.length)return
    onAddAll(setPosters.map(p=>p.id), availableSize)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <article
      className="group overflow-hidden rounded-[16px] border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-18px_rgba(8,2,14,0.18)]"
      style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}
    >
      {/* Cover image strip */}
      <div
        className="relative h-[200px] overflow-hidden"
        style={{ background: "var(--color-ground-soft)" }}
      >
        <ArtworkImage
          src={setDef.cover}
          alt={setDef.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {/* Mini poster thumbnails */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {setPosters.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="poster-frame poster-frame-mini h-12 w-9 overflow-hidden rounded-[5px] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            >
              <ArtworkImage src={p.image} alt={p.title} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        {discount > 0 && (
          <span
            className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "var(--color-yellow)", color: "var(--color-ink)" }}
          >
            {bundleRule.discountPercent}% offer — ask in chat
          </span>
        )}
      </div>

      <div className="p-5">
        <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--color-magenta)" }}>{setPosters.length} prints</p>
        <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{setDef.name}</h3>
        <p className="mt-0.5 text-[13px] font-medium italic" style={{ color: "var(--color-ink-soft)" }}>{setDef.tagline}</p>
        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{setDef.description}</p>

        {/* Prints list */}
        <ul className="mt-4 space-y-1">
          {setPosters.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-[13px]">
              <span style={{ color: "var(--color-ink)" }}>{p.title}</span>
              <span style={{ color: "var(--color-ink-soft)" }}>{formatMoney(priceFor(p, size))}</span>
            </li>
          ))}
        </ul>

        {/* Size picker */}
        <div className="mt-5 flex items-center gap-3">
          <label className="text-[11px] font-semibold tracking-[0.14em] uppercase shrink-0" style={{ color: "var(--color-ink-soft)" }}>Size</label>
          <div className="relative flex-1">
            <select
              aria-label={"Size for "+setDef.name}
              value={size}
              onChange={(e) => setSize(e.target.value as SizeKey)}
              className="w-full appearance-none rounded-full border py-2 pr-8 pl-3 text-[13px] focus:outline-none"
              style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)", color: "var(--color-ink)" }}
            >
              {allSizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }}><ChevronIcon className="h-4 w-4" /></span>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[18px] font-semibold text-ink">{formatMoney(total)}</p>
            {discount > 0 && <p className="text-[11px] text-ink-soft">Bundle offer confirmed by seller</p>}
            <p className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>set of {setPosters.length}</p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={added || !availableSize || !setPosters.length}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium transition hover:opacity-90 disabled:opacity-75"
            style={{ background: added ? "var(--color-success)" : "var(--color-magenta)", color: "var(--color-ground)" }}
          >
            {added ? <CheckIcon className="h-4 w-4" /> : <CartIcon className="h-4 w-4" />}
            {added ? "Added!" : "Add whole set"}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function GallerySetsPage() {
  const { addToCart, cartCount } = useStore()
  const { config } = useOffers()
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [bumped, setBumped] = useState(false)

  const discountPct = config.bundleRule.discountPercent

  const handleAddAll = (ids: string[], size: SizeKey) => {
    ids.forEach((id) => addToCart(id, size, 1))
    setBumped(true)
    setToast(`${ids.length} prints added to selection`)
    setTimeout(() => setBumped(false), 450)
    setTimeout(() => setToast(null), 3400)
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav
        cartCount={cartCount}
        bumped={bumped}
        onOpenCart={() => setCartOpen(true)}
        query=""
        onQueryChange={() => {}}
        SearchSlot={null}
        CartSlot={null}
      />

      <main className="mx-auto max-w-[1240px] px-4 py-12 sm:px-8 sm:py-16">
        {/* Header */}
        <header className="mb-12 text-center">
          <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: "var(--color-magenta)", fontFamily: "var(--font-display)" }}>
            Curated bundles
          </p>
          <h1
            className="mt-3 text-[32px] font-semibold tracking-[-0.03em] sm:text-[48px]"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
          >
            Gallery Sets
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Prints chosen to live together — same tone, same silence. Add an entire set in one tap
            {config.bundleRule.enabled ? ` — ask the seller about the ${discountPct}% bundle offer` : ""}.
          </p>
        </header>

        {/* Sets grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SETS.map((s) => (
            <SetCard key={s.id} setDef={s} onAddAll={handleAddAll} />
          ))}
        </div>
      </main>

      <Footer />

      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} onToast={setToast} />

      {toast && (
        <div
          role="status"
          className="animate-toast fixed bottom-6 left-1/2 z-[60] max-w-[92vw] rounded-full px-5 py-3 text-[13px] font-medium shadow-[0_16px_40px_-16px_rgba(8,2,14,0.9)]"
          style={{ background: "var(--color-yellow)", color: "var(--color-ink)" }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
