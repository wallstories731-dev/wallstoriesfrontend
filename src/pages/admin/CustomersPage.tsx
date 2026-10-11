import { useMemo, useState } from "react"
import { loadCustomerNotes, saveCustomerNotes } from "../../api"
import { useAdminOrders } from "../../context/AdminOrdersContext"
import type { AdminOrder } from "../../data/adminOrders"

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}
function CloseIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
}

type Customer = {
  key: string
  name: string
  phone: string
  city: string
  orders: AdminOrder[]
  totalSpend: number
  lastOrderAt: number
}

function buildCustomers(orders: AdminOrder[]): Customer[] {
  const map = new Map<string, Customer>()
  for (const o of orders) {
    const key = o.phone ? o.phone.replace(/\D/g, "") : o.name.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { key, name: o.name, phone: o.phone, city: o.city, orders: [], totalSpend: 0, lastOrderAt: 0 })
    }
    const c = map.get(key)!
    c.orders.push(o)
    if (!["new", "contacted", "cancelled"].includes(o.status)) c.totalSpend += o.total
    if (o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt
    if (!c.city && o.city) c.city = o.city
  }
  return [...map.values()].sort((a, b) => b.totalSpend - a.totalSpend)
}

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [notes, setNotes] = useState<string[]>(() => loadCustomerNotes()[customer.key] ?? [])
  const [noteInput, setNoteInput] = useState("")

  const addNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteInput.trim()) return
    const next = [noteInput.trim(), ...notes]
    setNotes(next)
    const all = loadCustomerNotes()
    all[customer.key] = next
    saveCustomerNotes(all)
    setNoteInput("")
  }

  const removeNote = (i: number) => {
    const next = notes.filter((_, idx) => idx !== i)
    setNotes(next)
    const all = loadCustomerNotes()
    all[customer.key] = next
    saveCustomerNotes(all)
  }

  const S = { color: "var(--color-ink-soft)" }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ background: "rgba(8,2,14,0.45)" }} onClick={onClose} />
      <div className="animate-slide-in relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto shadow-[0_0_60px_rgba(8,2,14,0.25)]" style={{ background: "var(--color-ground)" }}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-hairline)" }}>
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{customer.name}</h2>
            <p className="text-[12px]" style={S}>{customer.phone} {customer.city ? `· ${customer.city}` : ""}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--color-ground-soft)]" style={S}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Orders", value: customer.orders.length },
              { label: "Total spend", value: `₹${customer.totalSpend.toLocaleString("en-IN")}` },
              { label: "Last order", value: new Date(customer.lastOrderAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) },
            ].map((s) => (
              <div key={s.label} className="rounded-[12px] border p-3 text-center" style={{ background: "var(--color-ground-soft)", borderColor: "var(--color-hairline)" }}>
                <p className="text-[11px]" style={S}>{s.label}</p>
                <p className="mt-1 text-[16px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Order history */}
          <section>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Order history</p>
            <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
              {customer.orders.sort((a, b) => b.createdAt - a.createdAt).map((o) => (
                <div key={o.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--color-hairline)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono" style={S}>{o.ref}</p>
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>
                      {o.items.map((i) => i.posterTitle).join(", ")}
                    </p>
                    <p className="text-[11px]" style={S}>{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>₹{o.total.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] capitalize" style={S}>{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section>
            <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Notes</p>
            <div className="space-y-2">
              {notes.map((n, i) => (
                <div key={i} className="flex items-start gap-2 rounded-[10px] border px-3.5 py-2.5" style={{ borderColor: "var(--color-hairline)", background: "var(--color-ground-soft)" }}>
                  <p className="flex-1 text-[13px]" style={{ color: "var(--color-ink)" }}>{n}</p>
                  <button onClick={() => removeNote(i)} className="shrink-0 text-[10px] transition hover:opacity-70" style={{ color: "var(--color-danger)" }}>✕</button>
                </div>
              ))}
              <form onSubmit={addNote} className="flex gap-2">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
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
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const { orders } = useAdminOrders()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Customer | null>(null)

  const allCustomers = useMemo(() => buildCustomers(orders), [orders])
  const customers = useMemo(() => {
    const q = query.toLowerCase()
    return q ? allCustomers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q)
    ) : allCustomers
  }, [allCustomers, query])

  const S = { color: "var(--color-ink-soft)" }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>Customers</h1>
        <p className="mt-0.5 text-[13px]" style={S}>{allCustomers.length} unique customers</p>
      </div>

      <div className="relative max-w-[300px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={S}><SearchIcon className="h-4 w-4" /></span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, city…"
          className="w-full rounded-full border py-2 pr-3 pl-9 text-[13px] focus:outline-none"
          style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
        />
      </div>

      <div className="rounded-[14px] border overflow-hidden" style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-hairline)", background: "var(--color-ground-soft)" }}>
                {["Customer", "Phone", "City", "Orders", "Total spend", "Last order", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase" style={S}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.key} className="transition hover:bg-[color-mix(in_srgb,var(--color-ground-soft)_50%,transparent)]" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: "color-mix(in srgb, var(--color-magenta) 12%, transparent)", color: "var(--color-magenta)" }}>
                        {c.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="font-medium" style={{ color: "var(--color-ink)" }}>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={S}>{c.phone || "—"}</td>
                  <td className="px-4 py-3" style={S}>{c.city || "—"}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-ink)" }}>{c.orders.length}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-ink)" }}>₹{c.totalSpend.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3" style={S}>{new Date(c.lastOrderAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(c)} className="rounded-[6px] border px-3 py-1 text-[12px] font-medium transition hover:opacity-80" style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-soft)" }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-[13px]" style={S}>No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
