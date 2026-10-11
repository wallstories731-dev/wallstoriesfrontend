import AdminConfiguration from "./AdminConfiguration";
import { tagNames } from "../../lib/adminControls";
import { downloadAdminCsv, adminReplyLink } from "../../api/adminExport";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { adminApi, type AdminApi, type AdminCatalog } from "../../api/admin";
import type { PhotoReview } from "../../api/reviews";
import {
  posters as seedPosters,
  formatMoney,
  type Poster,
  type SizeKey,
} from "../../data/shop";
import { type AdminOrder, STATUS_LABELS } from "../../data/adminOrders";
import { useStore } from "../../context/StoreContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import ArtworkImage from "../../components/ArtworkImage";
import Logo from "../../components/Logo";
import useModal from "../../hooks/useModal";

const sections = [
  "dashboard",
  "prints",
  "tags",
  "categories",
  "content",
  "orders",
  "customers",
  "reviews",
  "offers",
  "settings",
] as const;
const labels = [
  "Overview",
  "Posters",
  "Tags",
  "Categories",
  "Site content",
  "Orders",
  "Customers",
  "Photo reviews",
  "Offers",
  "Settings",
];
const glyphs = ["✳", "▧", "#", "◉", "✎", "↗", "☺", "♥", "%", "⚙"];
export function sampleAdminData() {
  const posters = seedPosters.slice(0, 8).map((p, i) => ({
    ...p,
    tags: p.tags?.length ? p.tags : [i % 2 ? "nature" : "cinematic"],
  }));
  const order: AdminOrder = {
    id: "SAMPLE-001",
    ref: "SAMPLE-001",
    source: "storefront",
    status: "paid",
    name: "Sample customer",
    phone: "",
    city: "Sample city",
    pincode: "",
    items: [
      {
        posterId: posters[0].id,
        posterTitle: posters[0].title,
        posterCode: posters[0].code,
        size: "A4",
        qty: 2,
        unitPrice: 499,
        mrp: 499,
      },
    ],
    subtotal: 998,
    total: 998,
    discount: 0,
    shipping: 0,
    paymentRef: "SAMPLE-PAYMENT",
    paymentMethod: "Sample Razorpay",
    notes: [],
    timeline: [],
    createdAt: Date.UTC(2026, 9, 6),
    updatedAt: Date.UTC(2026, 9, 6),
  };
  return {
    catalog: { posters, revision: 0 },
    orders: [order],
    reviews: [
      {
        id: "SAMPLE-REVIEW",
        name: "Sample customer",
        city: "Sample city",
        rating: 5,
        text: "A sample review to show how moderation works.",
        photo: posters[0].image,
        approved: false,
        sample: true,
      },
    ] as PhotoReview[],
  };
}
function AdminExit() {
  const { logout } = useAdminAuth();
  return <button onClick={() => void logout()}>Sign out ↗</button>;
}

export default function AdminWorkspace({
  preview = false,
  api = adminApi,
}: {
  preview?: boolean;
  api?: AdminApi;
}) {
  const { setPosters } = useStore(),
    location = useLocation();
  const section =
    sections.find((s) => location.pathname.endsWith("/" + s)) || "dashboard";
  const base = preview ? "/admin/preview" : "/admin";
  const [catalog, setCatalog] = useState<AdminCatalog>({
    posters: [],
    revision: 0,
  });
  const [orders, setOrders] = useState<AdminOrder[]>([]),
    [reviews, setReviews] = useState<PhotoReview[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(!preview),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [editor, setEditor] = useState<Poster | null | undefined>();
  const [selection, setSelection] = useState<string[]>([]);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const alive = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    setSelection([]);
    setQuery("");
    setFilter("all");
    setSelected(null);
    setEditor(undefined);
    setMessage("");
  }, [section]);
  async function refresh() {
    if (preview) return;
    const version = ++generation.current;
    setLoading(true);
    setMessage("");
    const rows = await Promise.allSettled([
      api.loadCatalog(),
      api.loadOrders(),
      api.loadReviews(),
    ]);
    if (!alive.current || version !== generation.current) return;
    const nextErrors: Record<string, string> = {};
    rows.forEach((r, i) => {
      if (r.status === "rejected")
        nextErrors[["prints", "orders", "reviews"][i]] =
          r.reason instanceof Error
            ? r.reason.message
            : "Data could not be loaded. Retry.";
    });
    if (rows[0].status === "fulfilled") setCatalog(rows[0].value);
    if (rows[1].status === "fulfilled") setOrders(rows[1].value);
    if (rows[2].status === "fulfilled") setReviews(rows[2].value);
    setErrors(nextErrors);
    setLoading(false);
  }
  useEffect(() => {
    alive.current = true;
    if (preview) {
      const data = sampleAdminData();
      setCatalog(data.catalog);
      setOrders(data.orders);
      setReviews(data.reviews);
      setLoading(false);
    } else void refresh();
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [preview, api]);
  async function savePoster(poster: Poster) {
    if (preview || busy) return;
    setBusy(true);
    setMessage("");
    const next = catalog.posters.some((p) => p.id === poster.id)
      ? catalog.posters.map((p) => (p.id === poster.id ? poster : p))
      : [poster, ...catalog.posters];
    try {
      const saved = await api.saveCatalog({
        posters: next,
        revision: catalog.revision,
      });
      if (alive.current) {
        setCatalog(saved);
        setPosters(saved.posters.filter((p) => p.status !== "draft"));
        setEditor(undefined);
        setMessage("Poster saved to the shop. Drafts remain private.");
      }
    } catch (e) {
      if (alive.current) throw e;
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function commitCatalog(next: Poster[]): Promise<boolean> {
    if (preview || busy) return false;
    setBusy(true);
    setMessage("");
    try {
      const saved = await api.saveCatalog({
        posters: next,
        revision: catalog.revision,
      });
      if (alive.current) {
        setCatalog(saved);
        setPosters(saved.posters.filter((p) => p.status !== "draft"));
        setSelection([]);
        setErrors((old) => ({ ...old, [section]: "" }));
        setMessage("Catalog changes saved.");
      }
      return true;
    } catch (e) {
      if (alive.current)
        setErrors((old) => ({
          ...old,
          [section]:
            e instanceof Error ? e.message : "Catalog could not be saved.",
        }));
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const exportCatalog = () =>
    downloadAdminCsv("poster-catalog.csv", [
      ["ID", "Code", "Title", "Category", "Price", "Sizes", "Tags", "Status"],
      ...catalog.posters.map((p) => [
        p.id,
        p.code,
        p.title,
        p.category,
        p.basePrice,
        p.sizes.join(" / "),
        (p.tags || []).join(", "),
        p.status || "active",
      ]),
    ]);
  async function mutateOrder(id: string, patch: Record<string, unknown>) {
    if (preview || busy) return false;
    setBusy(true);
    setMessage("");
    try {
      await api.updateOrder(id, patch);
      const rows = await api.loadOrders();
      if (alive.current) {
        setOrders(rows);
        setSelected(rows.find((o) => o.id === id) || null);
        setErrors((old) => ({ ...old, orders: "" }));
        setMessage("Order update saved.");
      }
      return true;
    } catch (e) {
      if (alive.current)
        setErrors((old) => ({
          ...old,
          orders: e instanceof Error ? e.message : "Order update failed.",
        }));
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function moderate(id: string, remove = false) {
    if (preview || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (remove) await api.removeReview(id);
      else await api.approveReview(id);
      const rows = await api.loadReviews();
      if (alive.current) {
        setReviews(rows);
        setErrors((old) => ({ ...old, reviews: "" }));
        setMessage(
          remove ? "Review removed." : "Review approved and published.",
        );
      }
    } catch (e) {
      if (alive.current)
        setErrors((old) => ({
          ...old,
          reviews: e instanceof Error ? e.message : "Moderation failed.",
        }));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const paid = orders.filter(
    (o) =>
      o.paymentRef &&
      ["paid", "printed", "shipped", "delivered"].includes(o.status),
  );
  const pending = reviews.filter((r) => !r.approved).length;
  const shownPosters = catalog.posters.filter(
    (p) =>
      (filter === "all" || (p.status || "active") === filter) &&
      (
        p.title +
        " " +
        p.code +
        " " +
        p.category +
        " " +
        (p.tags || []).join(" ")
      )
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const shownOrders = orders.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (o.ref + " " + o.name + " " + o.city)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="admin-workspace">
      <a className="skip-content" href="#admin-main">
        Skip to admin content
      </a>
      <aside className="admin-rail">
        <Link className="admin-brand" to={base + "/dashboard"}>
          <Logo className="h-12 w-16" />
          <span>
            WALLstories<small>THE SHOP STUDIO</small>
          </span>
        </Link>
        <div className="admin-rail-label">A little order. A lot of art.</div>
        <nav aria-label="Admin navigation">
          {sections.map((s, i) => (
            <NavLink
              key={s}
              to={base + "/" + s}
              className={({ isActive }) => (isActive ? "selected" : "")}
            >
              <span aria-hidden="true">{glyphs[i]}</span>
              {labels[i]}
              {s === "reviews" && pending > 0 && <b>{pending}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-rail-bottom">
          <Link to="/">← Back to shop</Link>
          {preview ? <Link to="/admin">Admin sign in ↗</Link> : <AdminExit />}
          <small>300 GSM. Endless possibilities.</small>
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <span>{preview ? "READ-ONLY PREVIEW" : "ADMIN WORKSPACE"}</span>
          <div>
            <span className="admin-role">
              {preview ? "Sample data" : "Authorized admin"}
            </span>
            {!preview && (
              <button disabled={loading || busy} onClick={() => void refresh()}>
                Refresh ↻
              </button>
            )}
          </div>
        </header>
        <main id="admin-main">
          {preview && (
            <p className="admin-banner" role="note">
              <b>Preview mode ✳</b> Sample orders and reviews. Changes are
              disabled. <Link to="/admin">Sign in to manage your shop →</Link>
            </p>
          )}
          <div className="admin-page-heading">
            <div>
              <p className="game-kicker">Your shop, in one corner</p>
              <h1>
                {section === "dashboard"
                  ? "Good art. Great overview."
                  : labels[sections.indexOf(section)]}
                <span aria-hidden="true">✳</span>
              </h1>
              <p>
                {section === "dashboard"
                  ? "A clear view of what is selling and what needs your attention."
                  : section === "prints"
                    ? "Manage artwork, prices, sizes and published posters."
                    : section === "orders"
                      ? "Follow verified payments from printing to delivery."
                      : "Manage your storefront and keep every corner up to date."}
              </p>
            </div>
            {["tags", "categories", "content", "offers", "settings"].includes(
              section,
            ) && (
              <AdminConfiguration
                section={section}
                preview={preview}
                api={api}
                catalog={catalog}
                onCatalogSave={commitCatalog}
              />
            )}
            {section === "customers" && (
              <section className="admin-card">
                <div className="admin-card-heading">
                  <h2>Customers from online orders</h2>
                  <button
                    disabled={preview || loading || busy}
                    onClick={() =>
                      downloadAdminCsv("customers.csv", [
                        ["Name", "Email", "Phone", "City", "Order reference"],
                        ...orders.map((o) => [
                          o.name,
                          o.email,
                          o.phone,
                          o.city,
                          o.ref,
                        ]),
                      ])
                    }
                  >
                    Export customer CSV
                  </button>
                </div>
                <p className="admin-caption">
                  Customers who placed a recorded online order. Account
                  passwords and login permissions are managed by the identity
                  provider.
                </p>
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>City</th>
                        <th>Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...new Map(
                          orders.map((o) => [o.email || o.phone || o.name, o]),
                        ).values(),
                      ].map((o) => (
                        <tr key={o.id}>
                          <td>{o.name}</td>
                          <td>
                            {o.email}
                            <small>{o.phone}</small>
                          </td>
                          <td>{o.city}</td>
                          <td>
                            {
                              orders.filter(
                                (v) =>
                                  (v.email || v.phone || v.name) ===
                                  (o.email || o.phone || o.name),
                              ).length
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!orders.length && !loading && (
                  <p className="admin-empty">No online customers yet.</p>
                )}
              </section>
            )}
            {section === "prints" && (
              <button
                className="funk-button"
                disabled={preview || loading || busy || !!errors.prints}
                onClick={() => setEditor(null)}
              >
                Add poster <span aria-hidden="true">＋</span>
              </button>
            )}
          </div>
          {loading && (
            <p role="status" className="admin-notice">
              Loading your shop…
            </p>
          )}
          {message && (
            <p role="status" className="admin-notice">
              {message}
            </p>
          )}
          {(section === "dashboard"
            ? Object.entries(errors).filter(([, value]) => !!value)
            : Object.entries(errors)
                .filter(([, value]) => !!value)
                .filter(([key]) => key === section)
          ).map(([key, error]) => (
            <p key={key} role="alert" className="admin-error">
              {labels[sections.indexOf(key as (typeof sections)[number])]}:{" "}
              {error}
            </p>
          ))}
          {section === "dashboard" && (
            <>
              <div className="admin-stats">
                {[
                  [
                    "Published posters",
                    catalog.posters.filter((p) => p.status !== "draft").length,
                    "In your catalog",
                  ],
                  [
                    "Paid order value",
                    formatMoney(paid.reduce((sum, o) => sum + o.total, 0)),
                    "Verified paid orders in the latest 500",
                  ],
                  [
                    "To fulfil",
                    paid.filter((o) => ["paid", "printed"].includes(o.status))
                      .length,
                    "Ready for the next step",
                  ],
                  [
                    "Reviews to approve",
                    pending,
                    "Customer photos awaiting review",
                  ],
                ].map(([name, value, note], i) => (
                  <article key={name} className={"admin-stat stat-" + i}>
                    <span>{name}</span>
                    <strong>
                      {loading ||
                      (i === 0
                        ? errors.prints
                        : i === 3
                          ? errors.reviews
                          : errors.orders)
                        ? "—"
                        : value}
                    </strong>
                    <small>{note}</small>
                  </article>
                ))}
              </div>
              <div className="admin-overview-grid">
                <section className="admin-card">
                  <div className="admin-card-heading">
                    <h2>Latest orders</h2>
                    <Link to={base + "/orders"}>View orders ↗</Link>
                  </div>
                  {!orders.length ? (
                    <p className="admin-empty">
                      {loading
                        ? "Loading…"
                        : errors.orders
                          ? "Orders unavailable."
                          : "No online orders yet."}
                    </p>
                  ) : (
                    <OrderTable
                      orders={orders.slice(0, 5)}
                      onSelect={(o) => {
                        setSelected(o);
                      }}
                    />
                  )}
                  {selected && (
                    <OrderDetail
                      order={selected}
                      preview={preview}
                      busy={busy}
                      onClose={() => setSelected(null)}
                      onSave={mutateOrder}
                    />
                  )}
                </section>
                <section className="admin-card admin-next">
                  <span aria-hidden="true">♥</span>
                  <h2>A little care goes a long way.</h2>
                  <p>
                    {pending
                      ? pending +
                        " customer photo" +
                        (pending === 1 ? " is" : "s are") +
                        " waiting for your approval."
                      : "You are all caught up on photo reviews."}
                  </p>
                  <Link className="funk-button" to={base + "/reviews"}>
                    Review wall photos ↗
                  </Link>
                  <small>Only approved reviews appear in the storefront.</small>
                </section>
              </div>
            </>
          )}
          {section === "prints" && (
            <>
              <div className="admin-filters">
                <label>
                  Search posters
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Title, code or category"
                  />
                </label>
                <label>
                  Poster status
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All posters</option>
                    <option value="active">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <span>{shownPosters.length} posters</span>
              </div>
              <div className="admin-bulk-controls">
                <label className="admin-inline-check">
                  <input
                    type="checkbox"
                    disabled={
                      preview || loading || busy || !shownPosters.length
                    }
                    checked={
                      shownPosters.length > 0 &&
                      shownPosters.every((p) => selection.includes(p.id))
                    }
                    onChange={(e) =>
                      setSelection(
                        e.target.checked ? shownPosters.map((p) => p.id) : [],
                      )
                    }
                  />
                  Select visible posters
                </label>
                <span>{selection.length} selected</span>
                <button
                  disabled={preview || busy || loading || !selection.length}
                  onClick={() =>
                    void commitCatalog(
                      catalog.posters.map((p) =>
                        selection.includes(p.id)
                          ? { ...p, status: "active" }
                          : p,
                      ),
                    )
                  }
                >
                  Publish selected
                </button>
                <button
                  disabled={preview || busy || loading || !selection.length}
                  onClick={() =>
                    void commitCatalog(
                      catalog.posters.map((p) =>
                        selection.includes(p.id)
                          ? { ...p, status: "draft" }
                          : p,
                      ),
                    )
                  }
                >
                  Move to drafts
                </button>
                <button
                  disabled={preview || busy || loading || !selection.length}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete selected posters from the catalog? Paid order history is kept.",
                      )
                    )
                      void commitCatalog(
                        catalog.posters.filter(
                          (p) => !selection.includes(p.id),
                        ),
                      );
                  }}
                >
                  Delete selected
                </button>
                <button disabled={preview || loading} onClick={exportCatalog}>
                  Export catalog CSV
                </button>
              </div>
              <div className="admin-poster-grid">
                {shownPosters.map((p) => (
                  <article className="admin-poster" key={p.id}>
                    <label className="admin-poster-select">
                      <input
                        type="checkbox"
                        aria-label={"Select poster " + p.title}
                        disabled={preview || busy || loading}
                        checked={selection.includes(p.id)}
                        onChange={(e) =>
                          setSelection(
                            e.target.checked
                              ? [...selection, p.id]
                              : selection.filter((id) => id !== p.id),
                          )
                        }
                      />
                      <span>Select</span>
                    </label>
                    <ArtworkImage src={p.image} alt={p.alt || p.title} />
                    <div>
                      <span className="admin-pill">
                        {p.status === "draft" ? "Draft" : "Published"}
                      </span>
                      <small>
                        {p.code} · {p.category}
                      </small>
                      <h2>{p.title}</h2>
                      <p>
                        {formatMoney(p.basePrice)}{" "}
                        <small>base price · {p.sizes.join(" / ")}</small>
                      </p>
                      <button
                        disabled={preview || busy || loading || !!errors.prints}
                        onClick={() => setEditor(p)}
                      >
                        Edit {p.title} ↗
                      </button>
                      {preview && (
                        <button onClick={() => setEditor(p)}>
                          View editor for {p.title}
                        </button>
                      )}
                      <button
                        disabled={preview || busy || loading}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete " + p.title + " from the catalog?",
                            )
                          )
                            void commitCatalog(
                              catalog.posters.filter(
                                (item) => item.id !== p.id,
                              ),
                            );
                        }}
                      >
                        Delete {p.title}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!shownPosters.length && !loading && (
                <p className="admin-empty">
                  {errors.prints
                    ? "Catalog unavailable."
                    : "No posters match this view."}
                </p>
              )}
            </>
          )}
          {section === "orders" && (
            <>
              <div className="admin-filters">
                <label>
                  Search orders
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Reference, name or city"
                  />
                </label>
                <label>
                  Order status
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {Object.entries(STATUS_LABELS)
                      .filter(([s]) => !["contacted", "confirmed"].includes(s))
                      .map(([s, label]) => (
                        <option key={s} value={s}>
                          {s === "new" ? "Awaiting payment" : label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <button
                className="admin-secondary"
                disabled={preview || loading || busy}
                onClick={() =>
                  downloadAdminCsv("orders.csv", [
                    [
                      "Reference",
                      "Customer",
                      "Phone",
                      "City",
                      "Total",
                      "Status",
                      "Courier",
                      "Tracking",
                    ],
                    ...shownOrders.map((o) => [
                      o.ref,
                      o.name,
                      o.phone,
                      o.city,
                      o.total,
                      o.status,
                      o.courier,
                      o.trackingId,
                    ]),
                  ])
                }
              >
                Export order CSV
              </button>
              <p className="admin-caption">
                Latest 500 live online orders. WhatsApp and Instagram messages
                are handled in those apps. Payment status is verified by the
                server.
              </p>
              <div className="admin-card">
                <OrderTable orders={shownOrders} onSelect={setSelected} />
                {!shownOrders.length && !loading && (
                  <p className="admin-empty">
                    {errors.orders
                      ? "Orders unavailable."
                      : "No orders match this view."}
                  </p>
                )}
              </div>
              {selected && (
                <OrderDetail
                  order={selected}
                  preview={preview}
                  busy={busy}
                  onClose={() => setSelected(null)}
                  onSave={mutateOrder}
                />
              )}
            </>
          )}
          {section === "reviews" && (
            <>
              <div className="admin-filters">
                <label>
                  Review status
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All reviews</option>
                    <option value="pending">Awaiting approval</option>
                    <option value="approved">Published</option>
                  </select>
                </label>
                <span>Latest 50 reviews</span>
              </div>
              <div className="admin-review-grid">
                {reviews
                  .filter(
                    (r) =>
                      filter === "all" ||
                      (filter === "approved" ? r.approved : !r.approved),
                  )
                  .map((r) => (
                    <article className="admin-review" key={r.id}>
                      <ArtworkImage
                        src={r.photo}
                        alt={
                          (preview
                            ? "Sample artwork for preview"
                            : "Wall photo") +
                          " by " +
                          r.name
                        }
                      />
                      <div>
                        <span className="admin-pill">
                          {r.approved ? "Published" : "Awaiting approval"}
                        </span>
                        <h2>{r.name}</h2>
                        <p>
                          {r.city} · {r.rating}/5{" "}
                          {preview ? "· Sample content" : ""}
                        </p>
                        <blockquote>{r.text}</blockquote>
                        <div className="admin-review-actions">
                          {!r.approved && (
                            <button
                              disabled={preview || busy || loading}
                              onClick={() => void moderate(r.id)}
                            >
                              Approve review
                            </button>
                          )}
                          <button
                            disabled={preview || busy || loading}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Remove this review and its photo permanently?",
                                )
                              )
                                void moderate(r.id, true);
                            }}
                          >
                            Remove review
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!reviews.filter(
                (r) =>
                  filter === "all" ||
                  (filter === "approved" ? r.approved : !r.approved),
              ).length &&
                !loading && (
                  <p className="admin-empty">
                    {errors.reviews
                      ? "Reviews unavailable."
                      : "No reviews in this view."}
                  </p>
                )}
            </>
          )}
        </main>
        <footer className="admin-footer">
          Made for good walls. <span>WALLstories shop studio ✳</span>
        </footer>
      </div>
      {editor !== undefined && (
        <PosterEditor
          poster={editor}
          readOnly={preview}
          busy={busy}
          upload={api.uploadImage}
          onClose={() => {
            if (!busy) setEditor(undefined);
          }}
          onSave={savePoster}
        />
      )}
    </div>
  );
}
function OrderTable({
  orders,
  onSelect,
}: {
  orders: AdminOrder[];
  onSelect: (o: AdminOrder) => void;
}) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <b>{o.ref}</b>
                <small>
                  {new Date(o.createdAt).toLocaleDateString("en-IN")}
                </small>
              </td>
              <td>
                {o.name}
                <small>{o.city}</small>
              </td>
              <td>{formatMoney(o.total)}</td>
              <td>
                <span className="admin-pill">
                  {o.status === "new"
                    ? "Awaiting payment"
                    : STATUS_LABELS[o.status]}
                </span>
              </td>
              <td>
                <button
                  aria-label={"View order " + o.ref}
                  onClick={() => onSelect(o)}
                >
                  View ↗
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function OrderDetail({
  order,
  preview,
  busy,
  onClose,
  onSave,
}: {
  order: AdminOrder;
  preview: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const ref = useModal(true, () => {
    if (!busy) onClose();
  });
  const [delivery, setDelivery] = useState({
    name: order.name,
    phone: order.phone,
    address: order.address || "",
    city: order.city,
    pincode: order.pincode,
  });
  const reply = adminReplyLink(order);
  const [courier, setCourier] = useState(order.courier || ""),
    [trackingId, setTracking] = useState(order.trackingId || ""),
    [note, setNote] = useState("");
  const next: string | undefined = (
    {
      new: "cancelled",
      paid: "printed",
      printed: "shipped",
      shipped: "delivered",
    } as Record<string, string>
  )[order.status];
  return (
    <div className="admin-modal-overlay">
      <div
        ref={ref}
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-title"
      >
        <button
          className="admin-dialog-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close order"
        >
          ×
        </button>
        <p className="game-kicker">Order details</p>
        <h2 id="admin-order-title">{order.ref}</h2>
        <p>
          {order.name} · {order.city}
        </p>
        <p>
          {order.address} {order.pincode}
        </p>
        <p>
          {order.phone} {order.email}
        </p>
        <ul className="admin-order-items">
          {order.items.map((item, i) => (
            <li key={i}>
              <span>
                {item.posterTitle} · {item.size} × {item.qty}
              </span>
              <b>{formatMoney(item.unitPrice * item.qty)}</b>
            </li>
          ))}
        </ul>
        <p className="admin-total">
          Total <b>{formatMoney(order.total)}</b>
        </p>
        <p className="admin-caption">
          {order.paymentRef
            ? "Payment reference: " + order.paymentRef
            : "Payment is awaiting server confirmation."}
        </p>
        <p>
          Status:{" "}
          {order.status === "new"
            ? "Awaiting payment"
            : STATUS_LABELS[order.status]}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const saved = await onSave(order.id, {
              ...delivery,
              courier,
              trackingId,
              ...(note.trim() ? { note: note.trim() } : {}),
            });
            if (saved) setNote("");
          }}
        >
          {(["name", "phone", "address", "city", "pincode"] as const).map(
            (key) => (
              <label key={key}>
                {
                  {
                    name: "Customer name",
                    phone: "Customer phone",
                    address: "Delivery address",
                    city: "Delivery city",
                    pincode: "Delivery pincode",
                  }[key]
                }
                <input
                  value={delivery[key]}
                  maxLength={key === "address" ? 500 : 100}
                  onChange={(e) =>
                    setDelivery({ ...delivery, [key]: e.target.value })
                  }
                  disabled={preview || busy}
                />
              </label>
            ),
          )}
          <label>
            Courier
            <input
              value={courier}
              maxLength={100}
              onChange={(e) => setCourier(e.target.value)}
              disabled={preview || busy}
            />
          </label>
          <label>
            Tracking ID
            <input
              value={trackingId}
              maxLength={100}
              onChange={(e) => setTracking(e.target.value)}
              disabled={preview || busy}
            />
          </label>
          <label>
            Private order note
            <textarea
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              disabled={preview || busy}
            />
          </label>
          <button className="funk-button" disabled={preview || busy}>
            Save order details ↗
          </button>
        </form>
        {next && (
          <button
            className="admin-secondary"
            disabled={preview || busy}
            onClick={() => {
              if (
                next !== "cancelled" ||
                window.confirm("Cancel this unpaid order?")
              )
                void onSave(order.id, { status: next });
            }}
          >
            {next === "cancelled" ? "Cancel unpaid order" : "Mark " + next}
          </button>
        )}
        {!preview && reply && (
          <a
            className="admin-secondary"
            href={reply}
            target="_blank"
            rel="noopener noreferrer"
          >
            Prepare WhatsApp reply ↗
          </a>
        )}
        <div className="admin-notes">
          {order.notes.map((n) => (
            <p key={n.id}>{n.text}</p>
          ))}
        </div>
        {preview && (
          <p className="admin-caption">
            Sample order. Editing and payment changes are disabled.
          </p>
        )}
      </div>
    </div>
  );
}
function PosterEditor({
  poster,
  readOnly = false,
  busy,
  upload,
  onClose,
  onSave,
}: {
  poster: Poster | null;
  readOnly?: boolean;
  busy: boolean;
  upload: AdminApi["uploadImage"];
  onClose: () => void;
  onSave: (p: Poster) => Promise<void>;
}) {
  const { categories } = useStore();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [form, setForm] = useState<Poster>(() =>
    poster
      ? { ...poster, sizes: [...poster.sizes] }
      : {
          id: "poster-" + crypto.randomUUID(),
          code: "",
          title: "",
          category: categories.find((c) => c !== "All") || "Abstract",
          basePrice: 499,
          sizes: ["A4"],
          image: "",
          alt: "",
          description: "",
          added: Date.now(),
          status: "draft",
        },
  );
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const disabled = busy || uploading;
  const ref = useModal(true, () => {
    if (!disabled) onClose();
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setError("");
    if (!form.sizes.length) {
      setError("Choose at least one print size.");
      return;
    }
    if (tagsInput.trim()) {
      setError("Click Add tags to apply your pending tags before saving.");
      return;
    }
    if (
      form.sizes.some(
        (size) =>
          form.customPrices?.[size] &&
          form.customPrices[size]!.mrp < form.customPrices[size]!.price,
      )
    ) {
      setError("MRP must be at least the selling price.");
      return;
    }
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        code: form.code.trim(),
        category: form.category.trim(),
        alt: form.alt.trim() || form.title.trim(),
      });
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Poster could not be saved.");
    }
  }
  return (
    <div className="admin-modal-overlay">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="poster-editor-title"
        className="admin-dialog"
      >
        <button
          type="button"
          className="admin-dialog-close"
          onClick={onClose}
          disabled={disabled}
          aria-label="Close poster editor"
        >
          ×
        </button>
        <p className="game-kicker">Artwork studio</p>
        <h2 id="poster-editor-title">
          {poster ? "Edit poster" : "Add a new poster"}
        </h2>
        {readOnly && (
          <p className="admin-caption">
            Read-only poster editor preview. Sign in as an administrator to make
            changes.
          </p>
        )}
        <form onSubmit={submit}>
          <fieldset className="admin-editor-fields" disabled={readOnly}>
            {(["title", "code"] as const).map((key) => (
              <label key={key}>
                {key === "title"
                  ? "Poster title"
                  : key === "code"
                    ? "Catalog code"
                    : "Category"}
                <input
                  required
                  maxLength={100}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  disabled={disabled}
                />
              </label>
            ))}
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={disabled}
              >
                {[
                  ...new Set([
                    ...categories.filter((c) => c !== "All"),
                    form.category,
                  ]),
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Base price (₹)
              <input
                required
                type="number"
                min="1"
                max="500000"
                step="1"
                value={form.basePrice}
                onChange={(e) =>
                  setForm({ ...form, basePrice: Number(e.target.value) })
                }
                disabled={disabled}
              />
            </label>
            <small className="admin-caption">
              Other sizes use the shop size multipliers. Existing per-size
              prices stay in effect.
            </small>
            <fieldset disabled={disabled}>
              <legend>Available sizes</legend>
              <div className="admin-size-options">
                {(["A4", "A3", "A2", "12×18", "18×24"] as SizeKey[]).map(
                  (size) => (
                    <label key={size}>
                      <input
                        type="checkbox"
                        checked={form.sizes.includes(size)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            sizes: e.target.checked
                              ? [...form.sizes, size]
                              : form.sizes.filter((s) => s !== size),
                          })
                        }
                      />
                      {size}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <label>
              Artwork image URL
              <input
                type="url"
                required
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://…"
                disabled={disabled}
              />
            </label>
            <label>
              Or upload artwork
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={disabled}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  setError("");
                  try {
                    const url = await upload(file);
                    if (alive.current) setForm((f) => ({ ...f, image: url }));
                  } catch (e) {
                    if (alive.current)
                      setError(
                        e instanceof Error ? e.message : "Upload failed.",
                      );
                  } finally {
                    if (alive.current) setUploading(false);
                  }
                }}
              />
            </label>
            <small className="admin-caption">
              JPEG, PNG or WebP. Maximum 5 MB.
            </small>
            <label>
              Poster orientation
              <select
                value={form.orientation || "portrait"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    orientation: e.target.value as "portrait" | "square",
                  })
                }
                disabled={disabled}
              >
                <option value="portrait">Portrait</option>
                <option value="square">Square</option>
              </select>
            </label>
            <label>
              Poster badge
              <select
                value={form.badge || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    badge: e.target.value
                      ? (e.target.value as Poster["badge"])
                      : undefined,
                  })
                }
                disabled={disabled}
              >
                <option value="">No badge</option>
                <option value="new">New</option>
                <option value="bestseller">Bestseller</option>
                <option value="few-left">Few left</option>
              </select>
            </label>
            <fieldset disabled={disabled}>
              <legend>Poster tags</legend>
              <div className="admin-tag-chips">
                {(form.tags || []).map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    aria-label={"Remove poster tag " + tag}
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: form.tags?.filter((t) => t !== tag),
                      })
                    }
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
              <div className="admin-config-row">
                <label>
                  Add poster tags
                  <input
                    value={tagsInput}
                    maxLength={200}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Comma-separated tags"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const tags = [
                      ...new Set([
                        ...(form.tags || []).map((t) => t.toLowerCase()),
                        ...tagNames(tagsInput),
                      ]),
                    ];
                    if (tags.length > 20 || tags.some((t) => t.length > 40)) {
                      setError("Use up to 20 tags, each up to 40 characters.");
                      return;
                    }
                    setForm({ ...form, tags });
                    setTagsInput("");
                    setError("");
                  }}
                >
                  Add tags
                </button>
              </div>
            </fieldset>
            <fieldset disabled={disabled}>
              <legend>Per-size prices</legend>
              <p className="admin-caption">
                Leave blank to use the base price multiplier. MRP must be at
                least the selling price.
              </p>
              {form.sizes.map((size) => (
                <div className="admin-config-row" key={size}>
                  <label>
                    {size + " price (₹)"}
                    <input
                      type="number"
                      min="1"
                      max="500000"
                      step="1"
                      value={form.customPrices?.[size]?.price ?? ""}
                      onChange={(e) => {
                        const prices = { ...form.customPrices };
                        if (!e.target.value) delete prices[size];
                        else
                          prices[size] = {
                            price: Number(e.target.value),
                            mrp: Math.max(
                              Number(e.target.value),
                              prices[size]?.mrp || 0,
                            ),
                          };
                        setForm({ ...form, customPrices: prices });
                      }}
                    />
                  </label>
                  <label>
                    {size + " MRP (₹)"}
                    <input
                      type="number"
                      min={form.customPrices?.[size]?.price || 1}
                      max="500000"
                      step="1"
                      disabled={!form.customPrices?.[size]}
                      value={form.customPrices?.[size]?.mrp ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customPrices: {
                            ...form.customPrices,
                            [size]: {
                              price:
                                form.customPrices?.[size]?.price ||
                                form.basePrice,
                              mrp: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </fieldset>
            <fieldset disabled={disabled}>
              <legend>Gallery images</legend>
              <p className="admin-caption">
                Up to six additional images. Use image URLs; the main artwork
                stays first.
              </p>
              {(form.carouselImages || []).map((url, i) => (
                <div className="admin-config-row" key={i}>
                  <label>
                    {"Gallery image " + (i + 1)}
                    <input
                      required
                      type="url"
                      value={url}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          carouselImages: form.carouselImages?.map((v, j) =>
                            j === i ? e.target.value : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={"Remove gallery image " + (i + 1)}
                    onClick={() =>
                      setForm({
                        ...form,
                        carouselImages: form.carouselImages?.filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={(form.carouselImages || []).length >= 6}
                onClick={() =>
                  setForm({
                    ...form,
                    carouselImages: [...(form.carouselImages || []), ""],
                  })
                }
              >
                Add gallery image ＋
              </button>
            </fieldset>
            <label>
              Image description
              <input
                value={form.alt}
                maxLength={300}
                onChange={(e) => setForm({ ...form, alt: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label>
              Poster description
              <textarea
                value={form.description}
                maxLength={2000}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                disabled={disabled}
              />
            </label>
            <label>
              Visibility
              <select
                value={form.status || "active"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "active" | "draft",
                  })
                }
                disabled={disabled}
              >
                <option value="draft">Draft — private</option>
                <option value="active">Published — visible in shop</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="admin-error">
                {error}
              </p>
            )}
            <button className="funk-button" disabled={disabled}>
              {uploading ? "Uploading…" : busy ? "Saving…" : "Save poster ↗"}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
