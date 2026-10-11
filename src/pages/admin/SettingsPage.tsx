import { useState } from "react"
import { type AdminSettings, loadAdminSettings, saveAdminSettings } from "../../api"

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

export default function SettingsPage() {
  const [s, setS] = useState<AdminSettings>(loadAdminSettings)
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof AdminSettings>(key: K, val: AdminSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const updateTemplate = (key: "instagram" | "whatsapp", val: string) => {
    setS((prev) => ({ ...prev, messageTemplates: { ...prev.messageTemplates, [key]: val } }))
    setSaved(false)
  }

  const save = () => {
    saveAdminSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fieldCls = "w-full rounded-[10px] border px-3.5 py-2.5 text-[13px] focus:outline-none"
  const fieldStyle = { background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }
  const labelStyle = { color: "var(--color-ink-soft)" }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Settings</h1>
          <p className="mt-0.5 text-[13px]" style={labelStyle}>Store configuration</p>
        </div>
        <button
          onClick={save}
          className="rounded-full px-5 py-2 text-[13px] font-medium transition hover:opacity-90"
          style={{ background: saved ? "var(--color-success)" : "var(--color-magenta)", color: "var(--color-ground)" }}
        >
          {saved ? "Saved ✓" : "Save settings"}
        </button>
      </div>

      {/* Social & Contact */}
      <Section title="Social & contact">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>Instagram handle</label>
            <input value={s.instagramHandle} onChange={(e) => update("instagramHandle", e.target.value)} placeholder="@wallstories.in" className={fieldCls} style={fieldStyle} />
            <p className="mt-1 text-[11px]" style={labelStyle}>Shown in the storefront footer</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>WhatsApp number (with country code, no +)</label>
            <input value={s.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value.replace(/\D/g, ""))} placeholder="917598647185" className={fieldCls} style={fieldStyle} />
            <p className="mt-1 text-[11px]" style={labelStyle}>Used for "Reply on WhatsApp" links from enquiries</p>
          </div>
        </div>
      </Section>

      {/* Fulfilment */}
      <Section title="Fulfilment">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>Shipping days text</label>
            <input value={s.shippingDaysText} onChange={(e) => update("shippingDaysText", e.target.value)} placeholder="Ships in 4–6 business days" className={fieldCls} style={fieldStyle} />
            <p className="mt-1 text-[11px]" style={labelStyle}>Shown on product pages and checkout</p>
          </div>
          <div className="flex items-center justify-between rounded-[10px] border px-4 py-3" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}>
            <div>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>Show frame options</p>
              <p className="text-[12px]" style={labelStyle}>Let customers choose a frame with their print</p>
            </div>
            <Toggle on={s.frameOptionsEnabled} onChange={(v) => update("frameOptionsEnabled", v)} />
          </div>
        </div>
      </Section>

      {/* Message templates */}
      <Section title="Message templates" subtitle="Use {name}, {prints}, {size}, {total} as variables in the WhatsApp template">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>Instagram DM template</label>
            <textarea
              value={s.messageTemplates.instagram}
              onChange={(e) => updateTemplate("instagram", e.target.value)}
              rows={3}
              className={fieldCls + " resize-none"}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={labelStyle}>WhatsApp message template</label>
            <textarea
              value={s.messageTemplates.whatsapp}
              onChange={(e) => updateTemplate("whatsapp", e.target.value)}
              rows={5}
              className={fieldCls + " resize-none"}
              style={fieldStyle}
            />
            <p className="mt-1 text-[11px]" style={labelStyle}>Prefilled when clicking "Reply on WhatsApp" on an enquiry</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
