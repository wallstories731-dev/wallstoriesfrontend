import { useState, useRef, useMemo } from "react"
import { useStore } from "../../context/StoreContext"
import {
  type Poster, type SizeKey, categories as allCategories, sizeMultiplier, priceFor,
} from "../../data/shop"
import { csvCell, validateImageFile, uploadImage } from "../../api"

const ALL_SIZES: SizeKey[] = ["A4", "A3", "A2", "12×18", "18×24"]

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}
function EditIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></svg>
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
}
function CloseIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}
function DownloadIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(posters: Poster[]) {
  const headers = ["ID", "Code", "Title", "Category", "Base Price", "Status", "Sizes", "Badge", "Tags"]
  const rows = posters.map((p) => [
    p.id, p.code, p.title, p.category, p.basePrice,
    p.status ?? "active", p.sizes.join(", "), p.badge ?? "",
    (p.tags ?? []).join(", "),
  ])
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `wallstories-prints-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Auto-SKU generator ───────────────────────────────────────────────────────

const CATEGORY_CODES: Record<string, string> = {
  Movies: "MOV", Music: "MUS", Nature: "NAT", Botanical: "BOT",
  Abstract: "ABS", Typography: "TYP", Vintage: "VIN", Sports: "SPR", Anime: "ANI",
}

function genSku(category: string, posters: Poster[]) {
  const prefix = `WS-${CATEGORY_CODES[category] ?? category.toUpperCase().slice(0, 3)}-`
  const existing = posters.filter((p) => p.code.startsWith(prefix)).length
  return `${prefix}${String(existing + 1).padStart(2, "0")}`
}

// ─── Print Form ───────────────────────────────────────────────────────────────

type FormState = {
  title: string
  code: string
  description: string
  category: string
  tags: string
  image: string
  sizes: SizeKey[]
  sizePrices: Partial<Record<SizeKey, { price: string; mrp: string }>>
  badge: string
  featured: boolean
  status: "active" | "draft"
}

const EMPTY_FORM: FormState = {
  title: "", code: "", description: "", category: "Movies",
  tags: "", image: "", sizes: ["A4", "A3"], sizePrices: {},
  badge: "", featured: false, status: "active",
}

function posterToForm(p: Poster): FormState {
  const sizePrices: FormState["sizePrices"] = {}
  for (const s of p.sizes) {
    const cp = p.customPrices?.[s]
    const price = cp?.price ?? priceFor(p, s)
    const mrp = cp?.mrp ?? Math.round(price * 1.25)
    sizePrices[s] = { price: String(price), mrp: String(mrp) }
  }
  return {
    title: p.title,
    code: p.code,
    description: p.description,
    category: p.category,
    tags: (p.tags ?? []).join(", "),
    image: p.image,
    sizes: p.sizes,
    sizePrices,
    badge: p.badge ?? "",
    featured: p.featured ?? false,
    status: p.status ?? "active",
  }
}

function PrintForm({
  initial, poster, posters, onSave, onCancel,
}: {
  initial: FormState
  poster?: Poster
  posters: Poster[]
  onSave: (p: Partial<Poster> & Pick<Poster, "title" | "code" | "description" | "category" | "sizes" | "image" | "alt">) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof FormState, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }))

  // Auto-generate SKU when category changes and code is empty or auto-generated
  const handleCategoryChange = (cat: string) => {
    set("category", cat)
    if (!poster) set("code", genSku(cat, posters))
  }

  const handleImageFile = async (file: File) => {
    try { validateImageFile(file) } catch (e) { alert((e as Error).message); return }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      set("image", dataUrl)
      try {
        setUploading(true)
        const path = `prints/${Date.now()}-${file.name}`
        const url = await uploadImage(dataUrl, path)
        set("image", url)
      } catch {
        // keep data URL as fallback
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const toggleSize = (s: SizeKey) => {
    if (form.sizes.includes(s)) {
      set("sizes", form.sizes.filter((x) => x !== s))
    } else {
      const next = [...form.sizes, s]
      const price = poster ? priceFor(poster, s) : Math.round((parseInt(form.sizePrices["A4"]?.price ?? "499") * sizeMultiplier[s]) / 10) * 10 - 1
      const mrp = Math.round(price * 1.25)
      set("sizes", next)
      setForm((f) => ({
        ...f,
        sizes: next,
        sizePrices: { ...f.sizePrices, [s]: { price: String(price), mrp: String(mrp) } },
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const customPrices: Poster["customPrices"] = {}
    for (const s of form.sizes) {
      const sp = form.sizePrices[s]
      if (sp) customPrices[s] = { price: parseInt(sp.price) || 0, mrp: parseInt(sp.mrp) || 0 }
    }
    onSave({
      title: form.title,
      code: form.code,
      description: form.description,
      category: form.category as Poster["category"],
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      image: form.image || `https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=900&h=1200&fit=crop&auto=format&q=80`,
      alt: form.title,
      sizes: form.sizes,
      customPrices,
      badge: (form.badge || undefined) as Poster["badge"],
      featured: form.featured,
      status: form.status,
      basePrice: parseInt(form.sizePrices["A4"]?.price ?? "499") || 499,
    })
  }

  const fieldCls = "w-full rounded-[10px] border px-3.5 py-2.5 text-[13px] transition focus:outline-none"
  const fieldStyle = {
    background: "var(--color-ground-soft)",
    borderColor: "var(--color-hairline)",
    color: "var(--color-ink)",
  }
  const labelCls = "mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase"
  const labelStyle = { color: "var(--color-ink-soft)" }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Title */}
        <div>
          <label className={labelCls} style={labelStyle}>Title *</label>
          <input className={fieldCls} style={fieldStyle} required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Neon Tokyo" />
        </div>
        {/* SKU */}
        <div>
          <label className={labelCls} style={labelStyle}>SKU / Code *</label>
          <input className={fieldCls} style={fieldStyle} required value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="WS-MOV-01" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls} style={labelStyle}>Description</label>
        <textarea className={fieldCls + " resize-none"} style={fieldStyle} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description for the storefront…" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Category */}
        <div>
          <label className={labelCls} style={labelStyle}>Category</label>
          <div className="relative">
            <select
              className={fieldCls + " appearance-none pr-8"}
              style={fieldStyle}
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {allCategories.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className={labelCls} style={labelStyle}>Tags (comma-separated)</label>
          <input className={fieldCls} style={fieldStyle} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="cinematic, dark, urban" />
        </div>
      </div>

      {/* Image */}
      <div>
        <label className={labelCls} style={labelStyle}>Image</label>
        <div className="flex gap-3">
          {form.image && (
            <img src={form.image} alt="" className="h-20 w-16 rounded-[8px] object-cover shrink-0" style={{ border: "1px solid var(--color-hairline)" }} />
          )}
          <div className="flex-1 space-y-2">
            <input
              className={fieldCls}
              style={fieldStyle}
              value={form.image.startsWith("data:") ? "" : form.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://images.unsplash.com/…"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)", background: "var(--color-ground-soft)" }}
            >
              {uploading ? "Uploading…" : "Upload file"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
          </div>
        </div>
      </div>

      {/* Sizes + Prices */}
      <div>
        <label className={labelCls} style={labelStyle}>Sizes & Pricing</label>
        <div className="space-y-2">
          {ALL_SIZES.map((s) => {
            const active = form.sizes.includes(s)
            return (
              <div key={s} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSize(s)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border transition"
                  style={{
                    background: active ? "var(--color-magenta)" : "var(--color-ground-soft)",
                    borderColor: active ? "var(--color-magenta)" : "var(--color-hairline)",
                    color: "var(--color-ground)",
                  }}
                >
                  {active && <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>}
                </button>
                <span className="w-12 text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>{s}</span>
                {active && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>Price</span>
                      <input
                        type="number"
                        className="w-20 rounded-[8px] border px-2 py-1 text-[12px] focus:outline-none"
                        style={{ background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
                        value={form.sizePrices[s]?.price ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, sizePrices: { ...f.sizePrices, [s]: { ...(f.sizePrices[s] ?? { price: "", mrp: "" }), price: e.target.value } } }))}
                        placeholder="999"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>MRP</span>
                      <input
                        type="number"
                        className="w-20 rounded-[8px] border px-2 py-1 text-[12px] focus:outline-none"
                        style={{ background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
                        value={form.sizePrices[s]?.mrp ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, sizePrices: { ...f.sizePrices, [s]: { ...(f.sizePrices[s] ?? { price: "", mrp: "" }), mrp: e.target.value } } }))}
                        placeholder="1249"
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Badge */}
        <div>
          <label className={labelCls} style={labelStyle}>Badge</label>
          <div className="relative">
            <select className={fieldCls + " appearance-none pr-8"} style={fieldStyle} value={form.badge} onChange={(e) => set("badge", e.target.value)}>
              <option value="">None</option>
              <option value="new">New</option>
              <option value="bestseller">Bestseller</option>
              <option value="few-left">Few left</option>
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls} style={labelStyle}>Status</label>
          <div className="relative">
            <select className={fieldCls + " appearance-none pr-8"} style={fieldStyle} value={form.status} onChange={(e) => set("status", e.target.value as "active" | "draft")}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        {/* Featured */}
        <div className="flex items-end pb-1">
          <button
            type="button"
            onClick={() => set("featured", !form.featured)}
            className="flex items-center gap-2 text-[13px] font-medium"
            style={{ color: "var(--color-ink)" }}
          >
            <span
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ background: form.featured ? "var(--color-magenta)" : "var(--color-hairline)" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: form.featured ? "translateX(16px)" : "translateX(2px)" }}
              />
            </span>
            Featured
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--color-hairline)" }}>
        <button type="button" onClick={onCancel} className="rounded-full border px-5 py-2 text-[13px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>
          Cancel
        </button>
        <button type="submit" className="rounded-full px-5 py-2 text-[13px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>
          {poster ? "Save changes" : "Add print"}
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PrintsPage() {
  const { posters, setPosters } = useStore()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editingPoster, setEditingPoster] = useState<Poster | undefined>()

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return posters.filter((p) => {
      if (statusFilter !== "all" && (p.status ?? "active") !== statusFilter) return false
      if (q && !p.title.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false
      return true
    })
  }, [posters, query, statusFilter])

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))
  const toggleAll = () =>
    allSelected
      ? setSelected((prev) => { const n = new Set(prev); filtered.forEach((p) => n.delete(p.id)); return n })
      : setSelected((prev) => { const n = new Set(prev); filtered.forEach((p) => n.add(p.id)); return n })

  const bulkSetStatus = (status: "active" | "draft") => {
    setPosters(posters.map((p) => selected.has(p.id) ? { ...p, status } : p))
    setSelected(new Set())
  }

  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selected.size} print(s)? This cannot be undone.`)) return
    setPosters(posters.filter((p) => !selected.has(p.id)))
    setSelected(new Set())
  }

  const openAdd = () => { setEditingPoster(undefined); setFormOpen(true) }
  const openEdit = (p: Poster) => { setEditingPoster(p); setFormOpen(true) }

  const handleSave = (data: Partial<Poster> & Pick<Poster, "title" | "code" | "description" | "category" | "sizes" | "image" | "alt">) => {
    if (editingPoster) {
      setPosters(posters.map((p) => p.id === editingPoster.id ? { ...p, ...data } : p))
    } else {
      const newPoster: Poster = {
        id: data.code.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        added: posters.length,
        ...data,
      } as Poster
      setPosters([newPoster, ...posters])
    }
    setFormOpen(false)
  }

  const deleteOne = (id: string) => {
    if (!window.confirm("Delete this print?")) return
    setPosters(posters.filter((p) => p.id !== id))
  }

  const selectedCount = selected.size

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Prints</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>{posters.length} prints in catalogue</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition hover:opacity-80"
            style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)", background: "var(--color-ground)" }}
          >
            <DownloadIcon className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90"
            style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}
          >
            <PlusIcon className="h-4 w-4" />
            Add print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }}><SearchIcon className="h-4 w-4" /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or code…"
            className="w-full rounded-full border py-2 pr-3 pl-9 text-[13px] focus:outline-none"
            style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
          />
        </div>
        {(["all", "active", "draft"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="rounded-full border px-3.5 py-1.5 text-[12px] font-medium capitalize transition"
            style={{
              background: statusFilter === s ? "var(--color-ink)" : "var(--color-ground)",
              borderColor: statusFilter === s ? "var(--color-ink)" : "var(--color-hairline)",
              color: statusFilter === s ? "var(--color-ground)" : "var(--color-ink-soft)",
            }}
          >
            {s}
          </button>
        ))}

        {selectedCount > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px]" style={{ color: "var(--color-ink-soft)" }}>{selectedCount} selected</span>
            <button onClick={() => bulkSetStatus("active")} className="rounded-full border px-3 py-1 text-[12px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-success)", color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 8%, transparent)" }}>Activate</button>
            <button onClick={() => bulkSetStatus("draft")} className="rounded-full border px-3 py-1 text-[12px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-ink-soft)", color: "var(--color-ink-soft)", background: "var(--color-ground-soft)" }}>Draft</button>
            <button onClick={bulkDelete} className="rounded-full border px-3 py-1 text-[12px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)", background: "color-mix(in srgb, var(--color-danger) 8%, transparent)" }}>Delete</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[14px] border overflow-hidden" style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-hairline)", background: "var(--color-ground-soft)" }}>
                <th className="py-3 pl-4 pr-2 text-left">
                  <button onClick={toggleAll} className="flex h-5 w-5 items-center justify-center rounded-[5px] border transition" style={{ background: allSelected ? "var(--color-magenta)" : "var(--color-ground)", borderColor: allSelected ? "var(--color-magenta)" : "var(--color-hairline)", color: "var(--color-ground)" }}>
                    {allSelected && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>}
                  </button>
                </th>
                {["Print", "Code", "Category", "Base price", "Sizes", "Status", "Badge", ""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--color-ink-soft)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((poster) => {
                const isActive = (poster.status ?? "active") === "active"
                return (
                  <tr
                    key={poster.id}
                    style={{ borderBottom: "1px solid var(--color-hairline)" }}
                    className="transition hover:bg-[color-mix(in_srgb,var(--color-ground-soft)_50%,transparent)]"
                  >
                    <td className="py-3 pl-4 pr-2">
                      <button onClick={() => toggleSelect(poster.id)} className="flex h-5 w-5 items-center justify-center rounded-[5px] border transition" style={{ background: selected.has(poster.id) ? "var(--color-magenta)" : "var(--color-ground)", borderColor: selected.has(poster.id) ? "var(--color-magenta)" : "var(--color-hairline)", color: "var(--color-ground)" }}>
                        {selected.has(poster.id) && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={poster.image} alt="" className="h-10 w-8 shrink-0 rounded-[5px] object-cover" />
                        <span className="font-medium max-w-[140px] truncate" style={{ color: "var(--color-ink)" }}>{poster.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px]" style={{ color: "var(--color-ink-soft)" }}>{poster.code}</td>
                    <td className="px-3 py-3" style={{ color: "var(--color-ink-soft)" }}>{poster.category}</td>
                    <td className="px-3 py-3 font-medium" style={{ color: "var(--color-ink)" }}>₹{poster.basePrice.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3" style={{ color: "var(--color-ink-soft)" }}>{poster.sizes.length}</td>
                    <td className="px-3 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        style={{
                          background: isActive ? "color-mix(in srgb, var(--color-success) 10%, transparent)" : "var(--color-ground-soft)",
                          color: isActive ? "var(--color-success)" : "var(--color-ink-soft)",
                        }}
                      >
                        {isActive ? "Active" : "Draft"}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ color: "var(--color-ink-soft)" }}>
                      {poster.badge ? <span className="capitalize">{poster.badge}</span> : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(poster)} className="flex h-7 w-7 items-center justify-center rounded-[6px] transition hover:bg-[var(--color-ground-soft)]" style={{ color: "var(--color-ink-soft)" }} title="Edit"><EditIcon className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteOne(poster.id)} className="flex h-7 w-7 items-center justify-center rounded-[6px] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" style={{ color: "var(--color-danger)" }} title="Delete"><TrashIcon className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                    No prints match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(8,2,14,0.45)" }} onClick={() => setFormOpen(false)} />
          <div
            className="animate-slide-in relative flex h-full w-full max-w-[600px] flex-col overflow-y-auto shadow-[0_0_60px_rgba(8,2,14,0.25)]"
            style={{ background: "var(--color-ground)" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-hairline)" }}>
              <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>
                {editingPoster ? "Edit print" : "Add new print"}
              </h2>
              <button onClick={() => setFormOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--color-ground-soft)]" style={{ color: "var(--color-ink-soft)" }}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 px-6 py-5">
              <PrintForm
                initial={editingPoster ? posterToForm(editingPoster) : { ...EMPTY_FORM, code: genSku("Movies", posters) }}
                poster={editingPoster}
                posters={posters}
                onSave={handleSave}
                onCancel={() => setFormOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
