import { useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { useAdminOrders } from "../../context/AdminOrdersContext"
import { useStore } from "../../context/StoreContext"
import { STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "../../data/adminOrders"

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--color-ground)",
        borderColor: "var(--color-hairline)",
      }}
    >
      <p
        className="text-[11px] font-semibold tracking-[0.18em] uppercase"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-[28px] font-semibold tracking-[-0.03em]"
        style={{
          color: accent ? "var(--color-magenta)" : "var(--color-ink)",
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = {
    new: "var(--color-magenta)",
    contacted: "var(--color-ink-soft)",
    confirmed: "var(--color-success)",
    paid: "var(--color-success)",
    printed: "var(--color-ink-soft)",
    shipped: "var(--color-magenta-deep)",
    delivered: "var(--color-success)",
    cancelled: "var(--color-danger)",
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: `color-mix(in srgb, ${colors[status]} 12%, transparent)`,
        color: colors[status],
        border: `1px solid color-mix(in srgb, ${colors[status]} 25%, transparent)`,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function DashboardPage() {
  const { orders } = useAdminOrders()
  const { posters } = useStore()

  const now = Date.now()
  const startOfDay = new Date().setHours(0, 0, 0, 0)
  const startOfWeek = now - 7 * 86_400_000
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()

  const newToday = orders.filter(
    (o) => o.status === "new" && o.createdAt >= startOfDay,
  ).length

  const newThisWeek = orders.filter(
    (o) => o.status === "new" && o.createdAt >= startOfWeek,
  ).length

  const confirmedOrders = orders.filter(
    (o) => !["new", "contacted", "cancelled"].includes(o.status),
  ).length

  const revenueMonth = orders
    .filter((o) => o.createdAt >= startOfMonth && !["new", "contacted", "cancelled"].includes(o.status))
    .reduce((n, o) => n + o.total, 0)

  const paidOrders = orders.filter(
    (o) => !["new", "contacted", "cancelled"].includes(o.status),
  )
  const avgOrderValue = paidOrders.length > 0
    ? Math.round(paidOrders.reduce((n, o) => n + o.total, 0) / paidOrders.length)
    : 0

  // Enquiries over time (last 14 days)
  const enquiryChart = useMemo(() => {
    const days: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000)
      const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      const dayStart = new Date(d).setHours(0, 0, 0, 0)
      const dayEnd = dayStart + 86_400_000
      const count = orders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd).length
      days.push({ date: label, count })
    }
    return days
  }, [orders, now])

  // Top prints by number of items across all orders
  const topPrints = useMemo(() => {
    const map: Record<string, { title: string; code: string; qty: number }> = {}
    for (const order of orders) {
      for (const item of order.items) {
        if (!map[item.posterId]) {
          map[item.posterId] = { title: item.posterTitle, code: item.posterCode, qty: 0 }
        }
        map[item.posterId].qty += item.qty
      }
    }
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7)
  }, [orders])

  const recentEnquiries = [...orders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
        >
          Dashboard
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="New today" value={newToday} sub="enquiries" accent />
        <KpiCard label="New this week" value={newThisWeek} sub="enquiries" />
        <KpiCard label="Confirmed orders" value={confirmedOrders} sub="all time" />
        <KpiCard label="Revenue this month" value={fmt(revenueMonth)} />
        <KpiCard label="Avg. order value" value={avgOrderValue > 0 ? fmt(avgOrderValue) : "—"} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Enquiries over time */}
        <div
          className="rounded-[14px] border p-5"
          style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}
        >
          <p
            className="mb-4 text-[13px] font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            Enquiries over time
            <span className="ml-2 text-[11px] font-normal" style={{ color: "var(--color-ink-soft)" }}>
              last 14 days
            </span>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={enquiryChart} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-magenta)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--color-magenta)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-ground)",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-ink)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-magenta)"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top prints */}
        <div
          className="rounded-[14px] border p-5"
          style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}
        >
          <p
            className="mb-4 text-[13px] font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            Top prints
            <span className="ml-2 text-[11px] font-normal" style={{ color: "var(--color-ink-soft)" }}>
              by qty ordered
            </span>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={topPrints}
              layout="vertical"
              margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-hairline)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                dataKey="code"
                type="category"
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-ground)",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-ink)",
                }}
                formatter={(val, _k, props) => [`${Number(val)} units`, (props as { payload?: { title?: string } }).payload?.title ?? ""]}
              />
              <Bar dataKey="qty" fill="var(--color-magenta)" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent enquiries */}
      <div
        className="rounded-[14px] border"
        style={{ background: "var(--color-ground)", borderColor: "var(--color-hairline)" }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>
            Recent enquiries
          </p>
          <a
            href="/admin/enquiries"
            className="text-[12px] font-medium transition hover:opacity-70"
            style={{ color: "var(--color-magenta)" }}
          >
            View all →
          </a>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--color-hairline)" }}>
          {recentEnquiries.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-3 px-5 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>
                  {order.name}
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--color-ink-soft)" }}>
                  {order.ref} · {order.items.length} {order.items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <StatusBadge status={order.status} />
              <p className="shrink-0 text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                ₹{order.total.toLocaleString("en-IN")}
              </p>
              <p className="hidden shrink-0 text-[11px] sm:block" style={{ color: "var(--color-ink-soft)" }}>
                {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
