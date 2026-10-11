import { useState } from "react"
import { useOffers } from "../../context/OffersContext"
import { isCouponValid, type CouponCode } from "../../data/offers"

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></svg>
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
      style={{ background: on ? "var(--color-magenta)" : "var(--color-hairline)" }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform"
        style={{ background: "var(--color-ground)", transform: on ? "translateX(16px)" : "translateX(2px)" }}
      />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border" style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--color-hairline)" }}>
        <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

type NewCoupon = { code: string; discountPercent: string; expiresAt: string; usageLimit: string; description: string; enabled: boolean }
const EMPTY_COUPON: NewCoupon = { code: "", discountPercent: "10", expiresAt: "", usageLimit: "", description: "", enabled: true }

export default function OffersPage() {
  const { config, setBundleRule, addCoupon, updateCoupon, deleteCoupon } = useOffers()
  const { bundleRule, coupons } = config
  const [newCoupon, setNewCoupon] = useState<NewCoupon>(EMPTY_COUPON)
  const [showForm, setShowForm] = useState(false)

  const fieldCls = "w-full rounded-[10px] border px-3.5 py-2 text-[13px] focus:outline-none"
  const fieldStyle = { background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }
  const labelStyle = { color: "var(--color-ink-soft)" }
  const S = { color: "var(--color-ink-soft)" }

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoupon.code.trim()) return
    addCoupon({
      code: newCoupon.code.trim().toUpperCase(),
      discountPercent: parseFloat(newCoupon.discountPercent) || 10,
      expiresAt: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).getTime() : undefined,
      usageLimit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : undefined,
      description: newCoupon.description,
      enabled: newCoupon.enabled,
    })
    setNewCoupon(EMPTY_COUPON)
    setShowForm(false)
  }

  const statusFor = (c: CouponCode) => {
    if (!c.enabled) return { label: "Disabled", color: "var(--color-ink-soft)" }
    if (c.expiresAt && c.expiresAt < Date.now()) return { label: "Expired", color: "var(--color-danger)" }
    if (c.usageLimit !== undefined && c.usedCount >= c.usageLimit) return { label: "Limit reached", color: "var(--color-danger)" }
    return { label: "Active", color: "var(--color-success)" }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Offers</h1>
        <p className="mt-0.5 text-[13px]" style={S}>Bundle rules and coupon codes</p>
      </div>

      {/* Bundle Rule */}
      <Section title="Bundle rule">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>Enable bundle discount</p>
              <p className="text-[12px]" style={S}>Shown as a progress bar in the customer's selection panel</p>
            </div>
            <Toggle on={bundleRule.enabled} onChange={(v) => setBundleRule({ ...bundleRule, enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>Min unique prints</label>
              <input
                type="number"
                min={2}
                max={20}
                value={bundleRule.minItems}
                onChange={(e) => setBundleRule({ ...bundleRule, minItems: parseInt(e.target.value) || 3 })}
                className={fieldCls}
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>Discount %</label>
              <input
                type="number"
                min={1}
                max={50}
                value={bundleRule.discountPercent}
                onChange={(e) => setBundleRule({ ...bundleRule, discountPercent: parseFloat(e.target.value) || 10 })}
                className={fieldCls}
                style={fieldStyle}
              />
            </div>
          </div>
          <div className="rounded-[10px] border px-4 py-3 text-[13px]" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)", color: "var(--color-ink-soft)" }}>
            Customers who add {bundleRule.minItems}+ unique prints to their selection see a <strong style={{ color: "var(--color-ink)" }}>{bundleRule.discountPercent}% bundle saving</strong> badge on checkout.
          </div>
        </div>
      </Section>

      {/* Coupon Codes */}
      <Section title="Coupon codes">
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition hover:opacity-90"
              style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}
            >
              <PlusIcon className="h-4 w-4" /> New coupon
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddCoupon} className="rounded-[12px] border p-4 space-y-3" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-[0.12em] uppercase" style={labelStyle}>Code *</label>
                  <input value={newCoupon.code} onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER10" className={fieldCls} style={fieldStyle} required />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-[0.12em] uppercase" style={labelStyle}>Discount %</label>
                  <input type="number" min={1} max={100} value={newCoupon.discountPercent} onChange={(e) => setNewCoupon((p) => ({ ...p, discountPercent: e.target.value }))} className={fieldCls} style={fieldStyle} required />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-[0.12em] uppercase" style={labelStyle}>Expires (optional)</label>
                  <input type="date" value={newCoupon.expiresAt} onChange={(e) => setNewCoupon((p) => ({ ...p, expiresAt: e.target.value }))} className={fieldCls} style={fieldStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-[0.12em] uppercase" style={labelStyle}>Usage limit (optional)</label>
                  <input type="number" min={1} value={newCoupon.usageLimit} onChange={(e) => setNewCoupon((p) => ({ ...p, usageLimit: e.target.value }))} className={fieldCls} style={fieldStyle} placeholder="Unlimited" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold tracking-[0.12em] uppercase" style={labelStyle}>Description (internal)</label>
                <input value={newCoupon.description} onChange={(e) => setNewCoupon((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Influencer partner code" className={fieldCls} style={fieldStyle} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-full border px-4 py-1.5 text-[12px] font-medium" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>Cancel</button>
                <button type="submit" className="rounded-full px-4 py-1.5 text-[12px] font-medium hover:opacity-90 transition" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>Create coupon</button>
              </div>
            </form>
          )}

          {/* List */}
          {coupons.length === 0 ? (
            <p className="py-6 text-center text-[13px]" style={S}>No coupon codes yet.</p>
          ) : (
            <div className="space-y-2">
              {coupons.map((c) => {
                const st = statusFor(c)
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-[12px] border px-4 py-3" style={{ borderColor: "var(--color-hairline)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>{c.code}</span>
                        <span className="text-[12px] font-medium" style={{ color: "var(--color-magenta)" }}>{c.discountPercent}% off</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `color-mix(in srgb, ${st.color} 12%, transparent)`, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px]" style={S}>
                        {c.usedCount} used
                        {c.usageLimit !== undefined && ` / ${c.usageLimit} limit`}
                        {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                        {c.description && ` · ${c.description}`}
                      </p>
                    </div>
                    <Toggle on={c.enabled} onChange={(v) => updateCoupon(c.id, { enabled: v })} />
                    <button onClick={() => { if (window.confirm("Delete this coupon?")) deleteCoupon(c.id) }} className="flex h-7 w-7 items-center justify-center rounded-[6px] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" style={{ color: "var(--color-danger)" }}>
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
