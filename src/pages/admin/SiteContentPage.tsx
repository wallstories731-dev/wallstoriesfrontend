import { useState } from "react"
import { useSiteContent } from "../../context/SiteContentContext"
import { useStore } from "../../context/StoreContext"
import type { FaqItem } from "../../data/siteContent"

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></svg>
}
function GripIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" /></svg>
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors" style={{ background: on ? "var(--color-magenta)" : "var(--color-hairline)" }} role="switch" aria-checked={on}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform" style={{ background: "var(--color-ground)", transform: on ? "translateX(16px)" : "translateX(2px)" }} />
    </button>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border" style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--color-hairline)" }}>
        <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{title}</p>
        {subtitle && <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-soft)" }}>{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function SiteContentPage() {
  const { content, setAnnouncement, setHero, setFaq } = useSiteContent()
  const { posters } = useStore()
  const S = { color: "var(--color-ink-soft)" }
  const fieldCls = "w-full rounded-[10px] border px-3.5 py-2.5 text-[13px] focus:outline-none"
  const fieldStyle = { background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }

  // ── Announcement ─────────────────────────────────────────────────────────────
  const [annText, setAnnText] = useState(content.announcement.text)

  const saveAnnouncement = () => setAnnouncement({ enabled: content.announcement.enabled, text: annText })

  // ── Hero featured prints ──────────────────────────────────────────────────────
  const [heroIds, setHeroIds] = useState<string[]>(content.hero.featuredPosterIds)

  const saveHero = () => setHero({ featuredPosterIds: heroIds })

  const setHeroId = (i: number, id: string) => {
    const next = [...heroIds]
    next[i] = id
    setHeroIds(next)
  }

  const removeHeroId = (i: number) => {
    setHeroIds((prev) => prev.filter((_, idx) => idx !== i))
  }

  const addHeroSlot = () => {
    if (heroIds.length >= 3) return
    setHeroIds((prev) => [...prev, ""])
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  const [faqItems, setFaqItems] = useState<FaqItem[]>(content.faq)

  const saveFaq = () => setFaq(faqItems)

  const updateFaq = (id: string, patch: Partial<FaqItem>) => {
    setFaqItems((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f))
  }

  const addFaq = () => {
    setFaqItems((prev) => [...prev, { id: crypto.randomUUID(), question: "", answer: "" }])
  }

  const removeFaq = (id: string) => {
    setFaqItems((prev) => prev.filter((f) => f.id !== id))
  }

  const moveFaq = (i: number, dir: 1 | -1) => {
    const next = [...faqItems]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setFaqItems(next)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Site Content</h1>
        <p className="mt-0.5 text-[13px]" style={S}>Edit announcement bar, hero, and FAQ</p>
      </div>

      {/* Announcement Bar */}
      <Section title="Announcement bar" subtitle="The thin strip at the top of the storefront">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>Show announcement bar</p>
            <Toggle
              on={content.announcement.enabled}
              onChange={(v) => setAnnouncement({ ...content.announcement, text: annText, enabled: v })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={S}>Message</label>
            <input
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              className={fieldCls}
              style={fieldStyle}
              placeholder="Printed to order on 300 GSM matte · Ships in 4–6 days"
            />
          </div>
          <div className="flex justify-end">
            <button onClick={saveAnnouncement} className="rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>Save</button>
          </div>
        </div>
      </Section>

      {/* Hero featured prints */}
      <Section title="Hero featured prints" subtitle="Up to 3 prints shown in the storefront hero section (first = main featured)">
        <div className="space-y-3">
          {heroIds.map((id, i) => {
            const poster = posters.find((p) => p.id === id)
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-[11px] font-semibold text-center" style={S}>{i + 1}</span>
                {poster?.image && (
                  <img src={poster.image} alt="" className="h-10 w-8 shrink-0 rounded-[6px] object-cover" />
                )}
                <div className="relative flex-1">
                  <select
                    value={id}
                    onChange={(e) => setHeroId(i, e.target.value)}
                    className={fieldCls + " appearance-none pr-8"}
                    style={fieldStyle}
                  >
                    <option value="">— select a print —</option>
                    {posters.filter((p) => p.status !== "draft").map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.code})</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={S}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </span>
                </div>
                <button onClick={() => removeHeroId(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" style={{ color: "var(--color-danger)" }}>
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
          <div className="flex items-center gap-2">
            {heroIds.length < 3 && (
              <button onClick={addHeroSlot} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>
                <PlusIcon className="h-3.5 w-3.5" /> Add slot
              </button>
            )}
            <div className="flex-1" />
            <button onClick={saveHero} className="rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>Save</button>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section title="FAQ" subtitle="Shown on the storefront How It Works section">
        <div className="space-y-3">
          {faqItems.map((faq, i) => (
            <div key={faq.id} className="rounded-[12px] border p-4 space-y-2" style={{ borderColor: "var(--color-hairline)" }}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveFaq(i, -1)} disabled={i === 0} className="text-[8px] leading-none disabled:opacity-30" style={S}>▲</button>
                  <button onClick={() => moveFaq(i, 1)} disabled={i === faqItems.length - 1} className="text-[8px] leading-none disabled:opacity-30" style={S}>▼</button>
                </div>
                <span style={S as React.CSSProperties}><GripIcon className="h-4 w-4 shrink-0" /></span>
                <span className="flex-1 text-[12px] font-semibold" style={S}>Q{i + 1}</span>
                <button onClick={() => removeFaq(faq.id)} className="flex h-7 w-7 items-center justify-center rounded-[6px] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" style={{ color: "var(--color-danger)" }}>
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                value={faq.question}
                onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                placeholder="Question…"
                className={fieldCls}
                style={fieldStyle}
              />
              <textarea
                value={faq.answer}
                onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                placeholder="Answer…"
                rows={2}
                className={fieldCls + " resize-none"}
                style={fieldStyle}
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button onClick={addFaq} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>
              <PlusIcon className="h-3.5 w-3.5" /> Add question
            </button>
            <div className="flex-1" />
            <button onClick={saveFaq} className="rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>Save FAQ</button>
          </div>
        </div>
      </Section>
    </div>
  )
}
