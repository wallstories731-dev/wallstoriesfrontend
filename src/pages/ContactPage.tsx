import { copyText } from "../hooks/useCart"
import { useState } from "react"
import AnnouncementBar from "../components/AnnouncementBar"
import SiteNav from "../components/SiteNav"
import Footer from "../components/Footer"
import { useStore } from "../context/StoreContext"
import { getContactSettings } from "../api"

function InstagramIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
}
function WhatsAppIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
}

export default function ContactPage() {
  const { cartCount, shop } = useStore()
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [sent, setSent] = useState(false)
  const [preparedMessage, setPreparedMessage] = useState("")
  const [copied, setCopied] = useState(false)

  const waNumber = getContactSettings().whatsappNumber

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = `Hi! Message from ${form.name} (${form.email})\n\nSubject: ${form.subject}\n\n${form.message}`
    window.open(`https://ig.me/m/${shop.instagramUsername}`, "_blank", "noopener,noreferrer")
    setPreparedMessage(msg)
    setCopied(await copyText(msg))
    setSent(true)
  }

  const fieldCls = "w-full rounded-[10px] border px-3.5 py-2.5 text-[14px] focus:outline-none transition"
  const fieldStyle = { borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)", color: "var(--color-ink)" }
  const S = { color: "var(--color-ink-soft)" }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav cartCount={cartCount} bumped={false} onOpenCart={() => {}} />

      <main className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8 sm:py-20">
        <header className="mb-14 text-center">
          <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: "var(--color-magenta)", fontFamily: "var(--font-display)" }}>Get in touch</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] sm:text-[44px]" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Contact</h1>
          <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed" style={S}>
            Questions about an order, a print, or anything else — we&rsquo;re a small team and we read every message.
          </p>
        </header>

        <div className="grid gap-12 md:grid-cols-[1fr_340px]">
          {/* Form */}
          <div>
            {sent ? (
              <div
                className="rounded-[16px] border px-8 py-16 text-center"
                style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--color-success-soft)" }}>
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
                </div>
                <p className="text-[18px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Message ready to send</p>
                <p className="mt-2 text-[14px]" style={S}>{copied ? "Your message is copied. Paste it in Instagram and send it." : "Copy the prepared message below, then paste and send it in Instagram."}</p>
                <textarea readOnly value={preparedMessage} rows={6} aria-label="Prepared contact message" className="mt-5 w-full rounded-lg border border-hairline p-3 text-sm"/>
                <button onClick={() => setSent(false)} className="mt-6 text-[13px] underline underline-offset-4 transition hover:text-magenta" style={S}>Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={S} htmlFor="contact-name">Name *</label>
                    <input required id="contact-name" maxLength={100} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" className={fieldCls} style={fieldStyle} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={S} htmlFor="contact-email">Email *</label>
                    <input required type="email" id="contact-email" maxLength={254} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@email.com" className={fieldCls} style={fieldStyle} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={S} htmlFor="contact-subject">Subject *</label>
                  <input required id="contact-subject" maxLength={100} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Order question / Print enquiry / Other" className={fieldCls} style={fieldStyle} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] uppercase" style={S} htmlFor="contact-message">Message *</label>
                  <textarea required id="contact-message" maxLength={1000} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={6} placeholder="What can we help you with?" className={`${fieldCls} resize-none`} style={fieldStyle} />
                </div>
                <button type="submit" className="w-full rounded-full py-3 text-[15px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>
                  Send via Instagram →
                </button>
                <p className="text-[12px] text-center" style={S}>Opens Instagram. Copy and paste your message there to send it.</p>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-[14px] border p-6" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground)" }}>
              <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Fastest way to reach us</p>
              <p className="mt-2 text-[13px]" style={S}>Instagram DMs — we typically reply within 1–4 hours during business days.</p>
              <a
                href={`https://instagram.com/${shop.instagramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-3 rounded-[10px] border px-4 py-3 text-[14px] font-medium transition hover:border-magenta hover:text-magenta"
                style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
              >
                <InstagramIcon className="h-5 w-5 shrink-0" />
                @{shop.instagramUsername}
              </a>
            </div>

            <div className="rounded-[14px] border p-6" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground)" }}>
              <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>WhatsApp</p>
              <p className="mt-2 text-[13px]" style={S}>For order updates and quick questions.</p>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-3 rounded-[10px] border px-4 py-3 text-[14px] font-medium transition hover:border-[#25d366] hover:text-[#25d366]"
                style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                +91 75986 47185 · Chat on WhatsApp
              </a>
            </div>

            <div className="rounded-[14px] border p-6" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Response time</p>
              <p className="mt-1 text-[13px]" style={S}>We reply to all messages within 24 hours on business days. For urgent matters, Instagram DMs are fastest.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
