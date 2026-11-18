import { useState, useMemo } from "react"
import { useAdminOrders } from "../../context/AdminOrdersContext"
import { escapeHtml, getContactSettings } from "../../api"
import {
  type AdminOrder, type OrderStatus,
  ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS,
} from "../../data/adminOrders"

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}
function CloseIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildWaMessage(order: AdminOrder, template: string): string {
  return template
    .replace("{name}", order.name)
    .replace("{prints}", order.items.map((i) => i.posterTitle).join(", "))
    .replace("{size}", order.items.map((i) => i.size).join(", "))
    .replace("{total}", `₹${escapeHtml(order.total.toLocaleString("en-IN"))}`)
}

function openPackingSlip(order: AdminOrder) {
  const lines = order.items
    .map((i) => `<tr><td>${escapeHtml(i.posterTitle)}</td><td>${escapeHtml(i.size)}</td><td>${escapeHtml(i.qty)}</td><td>₹${(i.unitPrice * i.qty).toLocaleString("en-IN")}</td></tr>`)
    .join("")
  const html = `<!DOCTYPE html><html><head><title>Packing Slip ${escapeHtml(order.ref)}</title>
<style>body{font-family:sans-serif;padding:32px;max-width:560px;margin:auto}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:8px 4px;border-bottom:1px solid #eee}th{font-size:11px;text-transform:uppercase;color:#888}@media print{button{display:none}}</style>
</head><body>
<p style="font-size:11px;color:#888;margin:0">WALLstories</p>
<h2>${escapeHtml(order.ref)}</h2>
<p style="margin:0;font-size:13px">${escapeHtml(order.name)} · ${escapeHtml(order.phone)}${order.city ? " · " + escapeHtml(order.city) : ""}${order.pincode ? " " + escapeHtml(order.pincode) : ""}</p>
${order.address ? `<p style="font-size:12px;color:#555">${escapeHtml(order.address)}</p>` : ""}
<table><thead><tr><th>Print</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead><tbody>${lines}</tbody></table>
<p style="margin-top:16px;font-weight:600">Total: ₹${escapeHtml(order.total.toLocaleString("en-IN"))}</p>
${order.paymentRef ? `<p style="font-size:12px;color:#555">Payment ref: ${escapeHtml(order.paymentRef)}</p>` : ""}
${order.courier ? `<p style="font-size:12px;color:#555">Courier: ${escapeHtml(order.courier)}${order.trackingId ? " · " + escapeHtml(order.trackingId) : ""}</p>` : ""}
</body></html>`
  // Print through a hidden srcdoc iframe: no popup, no document.write, no opener to leak.
  const frame = document.createElement("iframe")
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  frame.srcdoc = html
  frame.onload = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 1500)
  }
  document.body.appendChild(frame)
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

function DetailPanel({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const { updateOrder, updateStatus, addNote } = useAdminOrders()
  const [note, setNote] = useState("")
  const [editField, setEditField] = useState<string | null>(null)

  const waNumber = getContactSettings().whatsappNumber
  const waTemplate = getContactSettings().whatsappTemplate
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildWaMessage(order, waTemplate))}`

  const field = (key: keyof AdminOrder, label: string, value: string, type = "text") => {
    const isEditing = editField === key
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0" style={{ borderColor: "var(--color-hairline)" }}>
        <span className="w-28 shrink-0 text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--color-ink-soft)" }}>{label}</span>
        {isEditing ? (
          <input
            autoFocus
            defaultValue={value}
            onBlur={(e) => { updateOrder(order.id, { [key]: e.target.value }); setEditField(null) }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            className="flex-1 rounded-[8px] border px-2.5 py-1 text-[13px] focus:outline-none"
            style={{ background: "var(--color-ground-soft)", borderColor: "var(--color-magenta)", color: "var(--color-ink)" }}
            type={type}
          />
        ) : (
          <button
            onClick={() => setEditField(key)}
            className="flex-1 text-left text-[13px] rounded-[6px] px-2 py-0.5 transition hover:bg-[var(--color-ground-soft)]"
            style={{ color: value ? "var(--color-ink)" : "var(--color-ink-soft)" }}
          >
            {value || "—"}
          </button>
        )}
      </div>
    )
  }

  const handleStatusChange = (status: OrderStatus) => {
    updateStatus(order.id, status)
  }

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    addNote(order.id, note.trim())
    setNote("")
  }

  const subtotal = order.items.reduce((n, i) => n + i.unitPrice * i.qty, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ background: "rgba(8,2,14,0.45)" }} onClick={onClose} />
      <div
        className="animate-slide-in relative flex h-full w-full max-w-[580px] flex-col overflow-y-auto shadow-[0_0_60px_rgba(8,2,14,0.25)]"
        style={{ background: "var(--color-ground)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-hairline)" }}>
          <div>
            <p className="text-[12px] font-mono" style={{ color: "var(--color-ink-soft)" }}>{order.ref}</p>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{order.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Reply on WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--color-ground-soft)]"
              style={{ borderColor: "var(--color-hairline)", color: "#25d366" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            </a>
            <button
              onClick={() => openPackingSlip(order)}
              title="Print packing slip"
              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--color-ground-soft)]"
              style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--color-ground-soft)]" style={{ color: "var(--color-ink-soft)" }}>
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status selector */}
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-soft)" }}>Move to status</p>
            <div className="flex flex-wrap gap-1.5">
              {ORDER_STATUSES.map((s) => {
                const c = STATUS_COLORS[s]
                const active = order.status === s
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${c.bg} ${c.text} ${c.border} ${active ? "ring-2 ring-offset-1" : "opacity-70 hover:opacity-100"}`}
                    style={{ ["--tw-ring-color" as string]: "var(--color-magenta)" }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Customer info */}
          <section>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Customer</p>
            <div className="rounded-[12px] border px-4" style={{ borderColor: "var(--color-hairline)" }}>
              {field("name", "Name", order.name)}
              {field("phone", "Phone", order.phone, "tel")}
              {field("email", "Email", order.email ?? "", "email")}
              {field("city", "City", order.city)}
              {field("pincode", "Pincode", order.pincode)}
              {field("address", "Address", order.address ?? "")}
            </div>
          </section>

          {/* Items */}
          <section>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Items</p>
            <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>{item.posterTitle}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
                      {item.posterCode} · {item.size} · qty {item.qty}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                      ₹{(item.unitPrice * item.qty).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] line-through" style={{ color: "var(--color-ink-soft)" }}>
                      ₹{(item.mrp * item.qty).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 space-y-1" style={{ background: "var(--color-ground-soft)" }}>
                <div className="flex justify-between text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
                  <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-[12px]" style={{ color: "var(--color-success)" }}>
                    <span>Discount</span><span>−₹{order.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
                  <span>Shipping</span><span>{order.shipping > 0 ? `₹${order.shipping}` : "Free"}</span>
                </div>
                <div className="flex justify-between text-[14px] font-semibold border-t pt-1.5" style={{ color: "var(--color-ink)", borderColor: "var(--color-hairline)" }}>
                  <span>Total</span><span>₹{order.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment & Fulfillment */}
          <section>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Payment & Fulfillment</p>
            <div className="rounded-[12px] border px-4" style={{ borderColor: "var(--color-hairline)" }}>
              {field("paymentRef", "Payment ref", order.paymentRef ?? "")}
              {field("paymentMethod", "Method", order.paymentMethod ?? "")}
              {field("courier", "Courier", order.courier ?? "")}
              {field("trackingId", "Tracking ID", order.trackingId ?? "")}
            </div>
          </section>

          {/* Notes */}
          <section>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Internal notes</p>
            <div className="space-y-2">
              {order.notes.map((n) => (
                <div key={n.id} className="rounded-[10px] border px-3.5 py-2.5" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}>
                  <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>{n.text}</p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
                    {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              <form onSubmit={handleNoteSubmit} className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                  className="flex-1 rounded-[10px] border px-3.5 py-2 text-[13px] focus:outline-none"
                  style={{ background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
                />
                <button type="submit" className="rounded-[10px] px-4 py-2 text-[13px] font-medium transition hover:opacity-90" style={{ background: "var(--color-magenta)", color: "var(--color-ground)" }}>
                  Add
                </button>
              </form>
            </div>
          </section>

          {/* Timeline */}
          <section>
            <p className="mb-3 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Timeline</p>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-1.5 bottom-1.5 w-px" style={{ background: "var(--color-hairline)" }} />
              {[...order.timeline].reverse().map((ev, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border-2"
                    style={{
                      background: "var(--color-ground)",
                      borderColor: i === 0 ? "var(--color-magenta)" : "var(--color-hairline)",
                    }}
                  />
                  <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                    {STATUS_LABELS[ev.status]}
                    {ev.note && <span className="ml-2 text-[12px] font-normal" style={{ color: "var(--color-ink-soft)" }}>— {ev.note}</span>}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
                    {new Date(ev.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanView({
  orders, onSelect,
}: {
  orders: AdminOrder[]
  onSelect: (o: AdminOrder) => void
}) {
  const { updateStatus } = useAdminOrders()
  const cols = ORDER_STATUSES.filter((s) => s !== "cancelled")
  const cancelled = orders.filter((o) => o.status === "cancelled")

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {cols.map((status) => {
          const colOrders = orders.filter((o) => o.status === status)
          const c = STATUS_COLORS[status]
          return (
            <div key={status} className="flex w-[220px] shrink-0 flex-col gap-2">
              <div className={`flex items-center gap-2 rounded-[8px] border px-3 py-1.5 ${c.bg} ${c.border}`}>
                <span className={`text-[12px] font-semibold ${c.text}`}>{STATUS_LABELS[status]}</span>
                <span className="ml-auto rounded-full px-1.5 text-[10px] font-semibold" style={{ background: "rgba(0,0,0,0.08)" }}>{colOrders.length}</span>
              </div>
              <div className="space-y-2">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onSelect(order)}
                    className="cursor-pointer rounded-[12px] border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}
                  >
                    <p className="text-[12px] font-mono mb-1" style={{ color: "var(--color-ink-soft)" }}>{order.ref}</p>
                    <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>{order.name}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
                      {order.items.length} {order.items.length === 1 ? "item" : "items"} · ₹{order.total.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1.5 text-[10px]" style={{ color: "var(--color-ink-soft)" }}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    {/* Quick-advance button */}
                    {status !== "delivered" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const next = ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1]
                          if (next) updateStatus(order.id, next)
                        }}
                        className="mt-2 w-full rounded-[6px] border py-1 text-[10px] font-medium transition hover:opacity-80"
                        style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}
                      >
                        → {STATUS_LABELS[ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] ?? status]}
                      </button>
                    )}
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <div className="rounded-[12px] border border-dashed py-6 text-center text-[11px]" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>
                    Empty
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Cancelled column */}
        {cancelled.length > 0 && (
          <div className="flex w-[220px] shrink-0 flex-col gap-2">
            <div className={`flex items-center gap-2 rounded-[8px] border px-3 py-1.5 ${STATUS_COLORS.cancelled.bg} ${STATUS_COLORS.cancelled.border}`}>
              <span className={`text-[12px] font-semibold ${STATUS_COLORS.cancelled.text}`}>Cancelled</span>
              <span className="ml-auto rounded-full px-1.5 text-[10px] font-semibold" style={{ background: "rgba(0,0,0,0.08)" }}>{cancelled.length}</span>
            </div>
            {cancelled.map((order) => (
              <div
                key={order.id}
                onClick={() => onSelect(order)}
                className="cursor-pointer rounded-[12px] border p-3 opacity-60 transition hover:opacity-100"
                style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}
              >
                <p className="text-[12px] font-mono" style={{ color: "var(--color-ink-soft)" }}>{order.ref}</p>
                <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>{order.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EnquiriesPage() {
  const { orders } = useAdminOrders()
  const [view, setView] = useState<"table" | "kanban">("table")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [selected, setSelected] = useState<AdminOrder | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (q && !o.name.toLowerCase().includes(q) && !o.ref.toLowerCase().includes(q) && !o.phone.includes(q)) return false
      return true
    }).sort((a, b) => b.createdAt - a.createdAt)
  }, [orders, query, statusFilter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Enquiries & Orders</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>{orders.length} total · {orders.filter((o) => o.status === "new").length} new</p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-full border overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
          {(["table", "kanban"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-2 text-[12px] font-medium capitalize transition"
              style={{
                background: view === v ? "var(--color-ink)" : "var(--color-ground)",
                color: view === v ? "var(--color-ground)" : "var(--color-ink-soft)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filters (table view only) */}
      {view === "table" && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative min-w-[200px] max-w-[280px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }}><SearchIcon className="h-4 w-4" /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, ref, phone…"
              className="w-full rounded-full border py-2 pr-3 pl-9 text-[13px] focus:outline-none"
              style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
              className="appearance-none rounded-full border py-2 pl-4 pr-8 text-[13px] focus:outline-none"
              style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink-soft)" }}><ChevronIcon className="h-4 w-4" /></span>
          </div>
        </div>
      )}

      {/* Table View */}
      {view === "table" ? (
        <div className="rounded-[14px] border overflow-hidden" style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-hairline)", background: "var(--color-ground-soft)" }}>
                  {["Ref", "Customer", "Items", "Total", "Status", "Source", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--color-ink-soft)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid var(--color-hairline)" }}
                    className="transition hover:bg-[color-mix(in_srgb,var(--color-ground-soft)_50%,transparent)]"
                  >
                    <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--color-ink-soft)" }}>{order.ref}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "var(--color-ink)" }}>{order.name}</p>
                      <p className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>{order.phone || order.city || "—"}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-ink-soft)" }}>
                      {order.items.map((i) => i.posterCode).join(", ")}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--color-ink)" }}>₹{order.total.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 capitalize" style={{ color: "var(--color-ink-soft)" }}>{order.via ?? order.source}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-ink-soft)" }}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(order)}
                        className="rounded-[6px] border px-3 py-1 text-[12px] font-medium transition hover:opacity-80"
                        style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                      No orders match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <KanbanView orders={orders} onSelect={setSelected} />
      )}

      {selected && <DetailPanel order={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
