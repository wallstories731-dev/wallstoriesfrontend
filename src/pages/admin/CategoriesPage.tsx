import { useState, useRef } from "react"
import { useStore } from "../../context/StoreContext"
import { useSiteContent } from "../../context/SiteContentContext"
import { validateImageFile, uploadImage } from "../../api"
import type { CategoryMeta } from "../../data/siteContent"

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></svg>
}
function EditIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function GripIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" /></svg>
}
function ImageIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
}

// Build a merged list: all categories from store, enriched with any saved meta
function buildMerged(cats: string[], meta: CategoryMeta[]): CategoryMeta[] {
  return cats
    .filter((c) => c !== "All")
    .map((name, i) => {
      const existing = meta.find((m) => m.name === name)
      return existing ?? { name, order: i }
    })
    .sort((a, b) => a.order - b.order)
}

export default function CategoriesPage() {
  const { categories, setCategories } = useStore()
  const { content, setCategoryMeta } = useSiteContent()
  const [items, setItems] = useState<CategoryMeta[]>(() =>
    buildMerged(categories, content.categoryMeta),
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [addName, setAddName] = useState("")
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [dirty, setDirty] = useState(false)

  const save = () => {
    const named = items.map((it, i) => ({ ...it, order: i }))
    setCategoryMeta(named)
    setCategories(["All", ...named.map((it) => it.name)])
    setDirty(false)
  }

  const startEdit = (name: string) => {
    setEditing(name)
    setEditName(name)
  }

  const commitEdit = (oldName: string) => {
    if (!editName.trim() || editName === oldName) { setEditing(null); return }
    const next = items.map((it) => it.name === oldName ? { ...it, name: editName.trim() } : it)
    setItems(next); setEditing(null); setDirty(true)
  }

  const remove = (name: string) => {
    if (!window.confirm(`Remove category "${name}"? Existing prints keep their category label.`)) return
    setItems((prev) => prev.filter((it) => it.name !== name))
    setDirty(true)
  }

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const name = addName.trim()
    if (!name || items.some((it) => it.name === name)) return
    setItems((prev) => [...prev, { name, order: prev.length }])
    setAddName("")
    setDirty(true)
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...items]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    setItems(next); setDirty(true)
  }
  const moveDown = (i: number) => {
    if (i === items.length - 1) return
    const next = [...items]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    setItems(next); setDirty(true)
  }

  const handleImageFile = async (name: string, file: File) => {
    try { validateImageFile(file) } catch (e) { alert((e as Error).message); return }
    setUploading(name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setItems((prev) => prev.map((it) => it.name === name ? { ...it, image: dataUrl } : it))
      try {
        const url = await uploadImage(dataUrl, `categories/${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.jpg`)
        setItems((prev) => prev.map((it) => it.name === name ? { ...it, image: url } : it))
      } catch { /* keep data URL */ } finally {
        setUploading(null); setDirty(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const S = { color: "var(--color-ink-soft)" }
  const card = { background: "var(--color-ground)", borderColor: "var(--color-hairline)" }

  const posterCounts = useStore().posters.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Categories</h1>
          <p className="mt-0.5 text-[13px]" style={S}>{items.length} categories · drag to reorder</p>
        </div>
        {dirty && (
          <button
            onClick={save}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90"
            style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}
          >
            <CheckIcon className="h-4 w-4" /> Save changes
          </button>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={addCategory} className="flex gap-2">
        <input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="New category name…"
          className="flex-1 rounded-full border px-4 py-2 text-[13px] focus:outline-none"
          style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
        />
        <button type="submit" className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>
          <PlusIcon className="h-4 w-4" /> Add
        </button>
      </form>

      {/* Category list */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3 rounded-[14px] border p-3" style={card}>
            {/* Grip + order buttons */}
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(i)} disabled={i === 0} className="flex h-5 w-5 items-center justify-center rounded text-[8px] transition hover:bg-[var(--color-ground-soft)] disabled:opacity-30" style={S}>▲</button>
              <button onClick={() => moveDown(i)} disabled={i === items.length - 1} className="flex h-5 w-5 items-center justify-center rounded text-[8px] transition hover:bg-[var(--color-ground-soft)] disabled:opacity-30" style={S}>▼</button>
            </div>

            {/* Cover image */}
            <div
              className="relative h-14 w-10 shrink-0 cursor-pointer overflow-hidden rounded-[8px]"
              style={{ background: "var(--color-ground-soft)", border: "1px solid var(--color-hairline)" }}
              onClick={() => fileRefs.current[item.name]?.click()}
              title="Click to set cover image"
            >
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span style={{ color: "var(--color-ink-soft)" }}><ImageIcon className="h-4 w-4" /></span>
                </div>
              )}
              {uploading === item.name && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-[8px] text-white">…</span>
                </div>
              )}
              <input
                ref={(el) => { fileRefs.current[item.name] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(item.name, f) }}
              />
            </div>

            {/* Name */}
            {editing === item.name ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => commitEdit(item.name)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item.name); if (e.key === "Escape") setEditing(null) }}
                className="flex-1 rounded-[8px] border px-2.5 py-1 text-[14px] font-medium focus:outline-none"
                style={{ background: "var(--color-ground-soft)", borderColor: "var(--color-magenta)", color: "var(--color-ink)" }}
              />
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: "var(--color-ink)" }}>{item.name}</p>
                <p className="text-[11px]" style={S}>{posterCounts[item.name] ?? 0} prints</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button onClick={() => startEdit(item.name)} className="flex h-8 w-8 items-center justify-center rounded-[6px] transition hover:bg-[var(--color-ground-soft)]" style={S} title="Rename">
                <EditIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(item.name)} className="flex h-8 w-8 items-center justify-center rounded-[6px] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" style={{ color: "var(--color-danger)" }} title="Remove">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
