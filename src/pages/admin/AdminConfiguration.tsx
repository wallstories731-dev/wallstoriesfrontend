import { useEffect, useRef, useState } from "react";
import { defaultSiteSettings, type SiteSettings } from "../../api/publication";
import type { AdminApi, AdminCatalog } from "../../api/admin";
import { editTag, tagNames } from "../../lib/adminControls";
import { useStore } from "../../context/StoreContext";
import { useSiteContent } from "../../context/SiteContentContext";
import { useOffers } from "../../context/OffersContext";
import { DEFAULT_COPY } from "../../data/siteContent";
import type { Poster } from "../../data/shop";

export default function AdminConfiguration({
  section,
  preview,
  api,
  catalog,
  onCatalogSave,
}: {
  section: string;
  preview: boolean;
  api: AdminApi;
  catalog: AdminCatalog;
  onCatalogSave: (posters: Poster[]) => Promise<boolean>;
}) {
  const store = useStore(),
    { replaceContent } = useSiteContent(),
    { replaceOffers } = useOffers();
  const [form, setForm] = useState<SiteSettings>(defaultSiteSettings),
    [saved, setSaved] = useState<SiteSettings | null>(null),
    [loading, setLoading] = useState(!preview),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (preview) {
      const d = defaultSiteSettings();
      setForm(d);
      setSaved(d);
      setLoading(false);
    } else {
      setLoading(true);
      api
        .loadSettings()
        .then((d) => {
          if (alive.current) {
            setForm(d);
            setSaved(d);
          }
        })
        .catch((e) => {
          if (alive.current) setError(e.message);
        })
        .finally(() => {
          if (alive.current) setLoading(false);
        });
    }
    return () => {
      alive.current = false;
    };
  }, [api, preview, retry]);
  const dirty = !!saved && JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !preview) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, preview]);
  useEffect(() => {
    setMessage("");
  }, [section]);
  const [newName, setNewName] = useState(""),
    [tagTarget, setTagTarget] = useState("all"),
    [tagRename, setTagRename] = useState<Record<string, string>>({});
  const disabled = preview || loading || busy || !saved;
  const names = [
    ...new Set(
      catalog.posters.flatMap((p) =>
        (p.tags || []).map((t) => t.toLowerCase()),
      ),
    ),
  ].sort();
  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.saveSettings(form);
      if (alive.current) {
        setForm(result);
        setSaved(result);
        store.setShop(result.shop);
        store.setCategories(result.categories);
        store.setFeaturedConfig(result.featuredConfig);
        replaceContent(result.content);
        replaceOffers(result.offers);
        setMessage("Changes published to the storefront.");
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Changes were not published.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function tagsAction(posters: Poster[]) {
    if (disabled) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (await onCatalogSave(posters)) {
        setMessage("Poster tags saved.");
        setNewName("");
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Tag update failed.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const copy = { ...DEFAULT_COPY, ...form.content.copy };
  const copyField = (key: string, label: string, large = false) => (
    <label key={key}>
      {label}
      {large ? (
        <textarea
          value={copy[key] || ""}
          maxLength={6000}
          onChange={(e) =>
            setForm({
              ...form,
              content: {
                ...form.content,
                copy: { ...copy, [key]: e.target.value },
              },
            })
          }
        />
      ) : (
        <input
          value={copy[key] || ""}
          maxLength={300}
          onChange={(e) =>
            setForm({
              ...form,
              content: {
                ...form.content,
                copy: { ...copy, [key]: e.target.value },
              },
            })
          }
        />
      )}
    </label>
  );
  return (
    <div className="admin-config">
      {!preview && (
        <button
          className="admin-secondary"
          type="button"
          disabled={busy || loading}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Discard unpublished changes and reload?")
            ) {
              setSaved(null);
              setError("");
              setRetry((v) => v + 1);
            }
          }}
        >
          Reload settings ↻
        </button>
      )}
      {loading && <p role="status">Loading published settings…</p>}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-notice">
          {message}
        </p>
      )}
      {section === "tags" ? (
        <>
          <form
            className="admin-card"
            onSubmit={(e) => {
              e.preventDefault();
              const tags = tagNames(newName);
              if (tags.length !== 1 || tags[0].length > 40) {
                setError("Enter one tag, up to 40 characters.");
                return;
              }
              const next = catalog.posters.map((p) =>
                tagTarget === "all" || tagTarget === p.id
                  ? {
                      ...p,
                      tags: [
                        ...new Set([
                          ...(p.tags || []).map((t) => t.toLowerCase()),
                          tags[0],
                        ]),
                      ],
                    }
                  : p,
              );
              if (next.some((p) => (p.tags || []).length > 20)) {
                setError("Each poster supports up to 20 tags.");
                return;
              }
              void tagsAction(next);
            }}
          >
            <fieldset disabled={disabled || !catalog.posters.length}>
              <legend>Create or apply a tag</legend>
              <div className="admin-config-row">
                <label>
                  New tag
                  <input
                    required
                    maxLength={40}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. cinematic"
                  />
                </label>
                <label>
                  Add tag to
                  <select
                    value={tagTarget}
                    onChange={(e) => setTagTarget(e.target.value)}
                  >
                    <option value="all">All posters</option>
                    {catalog.posters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="funk-button">Apply tag</button>
              </div>
            </fieldset>
          </form>
          <section className="admin-card">
            <h2>Tag library</h2>
            <p className="admin-caption">
              Renaming or removing a tag updates every poster using it.
            </p>
            {!names.length && (
              <p>No tags yet. Add one above or in a poster editor.</p>
            )}
            <div className="admin-taxonomy-list">
              {names.map((tag) => (
                <div key={tag}>
                  <span>
                    <b>{tag}</b>
                    <small>
                      {
                        catalog.posters.filter((p) =>
                          p.tags?.some((t) => t.toLowerCase() === tag),
                        ).length
                      }{" "}
                      posters
                    </small>
                  </span>
                  <label>
                    <span className="sr-only">Rename tag {tag}</span>
                    <input
                      maxLength={40}
                      value={tagRename[tag] ?? tag}
                      onChange={(e) =>
                        setTagRename({ ...tagRename, [tag]: e.target.value })
                      }
                      disabled={disabled}
                    />
                  </label>
                  <button
                    disabled={disabled}
                    onClick={() => {
                      try {
                        void tagsAction(
                          editTag(catalog.posters, tag, tagRename[tag] ?? tag),
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Rename
                  </button>
                  <button
                    disabled={disabled}
                    aria-label={"Remove tag " + tag}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove “" + tag + "” from every poster?",
                        )
                      )
                        void tagsAction(editTag(catalog.posters, tag));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <form onSubmit={publish}>
          <div className="admin-publish-bar">
            <p>
              {preview
                ? "Read-only sample configuration"
                : dirty
                  ? "You have unpublished changes."
                  : "Showing the published configuration."}
            </p>
            <div>
              <button
                type="button"
                disabled={disabled || !dirty}
                onClick={() => {
                  if (saved) {
                    setForm(saved);
                    setError("");
                  }
                }}
              >
                Discard changes
              </button>
              <button className="funk-button" disabled={disabled || !dirty}>
                {busy ? "Publishing…" : "Publish changes ↗"}
              </button>
            </div>
          </div>
          <fieldset disabled={disabled}>
            {section === "content" && (
              <>
                <section className="admin-card">
                  <h2>Announcement</h2>
                  <label className="admin-inline-check">
                    <input
                      type="checkbox"
                      checked={form.content.announcement.enabled}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          content: {
                            ...form.content,
                            announcement: {
                              ...form.content.announcement,
                              enabled: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Show announcement bar
                  </label>
                  <label>
                    Announcement text
                    <input
                      maxLength={1000}
                      value={form.content.announcement.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          content: {
                            ...form.content,
                            announcement: {
                              ...form.content.announcement,
                              text: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </label>
                </section>
                <section className="admin-card">
                  <h2>Homepage</h2>
                  <div className="admin-config-row">
                    {copyField("heroKicker", "Hero kicker")}
                    {copyField("heroTitle", "Hero heading")}
                    {copyField("heroHighlight", "Hero highlight")}
                  </div>
                  {copyField("heroIntro", "Hero introduction", true)}
                  {copyField("heroCta", "Hero button text")}
                  {copyField("catalogTitle", "Catalog heading")}
                  <label>
                    Featured hero poster
                    <select
                      value={form.featuredConfig.posterId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          featuredConfig: { posterId: e.target.value },
                          content: {
                            ...form.content,
                            hero: {
                              ...form.content.hero,
                              featuredPosterIds: [e.target.value],
                            },
                          },
                        })
                      }
                    >
                      <option value="">First available poster</option>
                      {catalog.posters
                        .filter((p) => p.status !== "draft")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  </label>
                </section>
                <section className="admin-card">
                  <h2>About, footer and policy introductions</h2>
                  {copyField("aboutTitle", "About heading")}
                  {copyField("aboutIntro", "About introduction", true)}
                  {copyField("aboutStory", "Our story", true)}
                  {copyField("footerDescription", "Footer description", true)}
                  {copyField("shippingIntro", "Shipping introduction", true)}
                  {copyField("returnsIntro", "Returns introduction", true)}
                  {copyField("privacyIntro", "Privacy introduction", true)}
                  {copyField("helpIntro", "Help introduction", true)}
                </section>
                <section className="admin-card">
                  <div className="admin-card-heading">
                    <h2>Frequently asked questions</h2>
                    <button
                      type="button"
                      disabled={form.content.faq.length >= 50}
                      onClick={() =>
                        setForm({
                          ...form,
                          content: {
                            ...form.content,
                            faq: [
                              ...form.content.faq,
                              {
                                id: crypto.randomUUID(),
                                question: "",
                                answer: "",
                              },
                            ],
                          },
                        })
                      }
                    >
                      Add FAQ ＋
                    </button>
                  </div>
                  {form.content.faq.map((f, i) => (
                    <div className="admin-faq-editor" key={f.id}>
                      <label>
                        {"FAQ " + (i + 1) + " question"}
                        <input
                          required
                          value={f.question}
                          maxLength={300}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              content: {
                                ...form.content,
                                faq: form.content.faq.map((item) =>
                                  item.id === f.id
                                    ? { ...item, question: e.target.value }
                                    : item,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <label>
                        {"FAQ " + (i + 1) + " answer"}
                        <textarea
                          required
                          value={f.answer}
                          maxLength={6000}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              content: {
                                ...form.content,
                                faq: form.content.faq.map((item) =>
                                  item.id === f.id
                                    ? { ...item, answer: e.target.value }
                                    : item,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          disabled={i === 0}
                          aria-label={"Move FAQ " + (i + 1) + " up"}
                          onClick={() => {
                            const list = [...form.content.faq];
                            [list[i - 1], list[i]] = [list[i], list[i - 1]];
                            setForm({
                              ...form,
                              content: { ...form.content, faq: list },
                            });
                          }}
                        >
                          Move up ↑
                        </button>
                        <button
                          type="button"
                          aria-label={"Remove FAQ " + (i + 1)}
                          onClick={() =>
                            setForm({
                              ...form,
                              content: {
                                ...form.content,
                                faq: form.content.faq.filter(
                                  (item) => item.id !== f.id,
                                ),
                              },
                            })
                          }
                        >
                          Remove FAQ
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              </>
            )}
            {section === "categories" && (
              <section className="admin-card">
                <h2>Category controls</h2>
                <p className="admin-caption">
                  Add, reorder or remove unused categories. Edit a poster’s
                  category before removing a category it uses.
                </p>
                <div className="admin-config-row">
                  <label>
                    New category
                    <input
                      maxLength={100}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const name = newName.trim();
                      if (
                        !name ||
                        form.categories.some(
                          (c) => c.toLowerCase() === name.toLowerCase(),
                        )
                      ) {
                        setError("Enter a unique category name.");
                        return;
                      }
                      setForm({
                        ...form,
                        categories: [...form.categories, name],
                      });
                      setNewName("");
                      setError("");
                    }}
                  >
                    Add category ＋
                  </button>
                </div>
                <div className="admin-taxonomy-list">
                  {form.categories
                    .filter((c) => c !== "All")
                    .map((name, i) => {
                      const used = catalog.posters.filter(
                        (p) => p.category === name,
                      ).length;
                      return (
                        <div key={name}>
                          <b>{name}</b>
                          <small>{used} posters</small>
                          <button
                            type="button"
                            disabled={i === 0}
                            aria-label={"Move category " + name + " up"}
                            onClick={() => {
                              const list = [...form.categories],
                                index = list.indexOf(name);
                              [list[index - 1], list[index]] = [
                                list[index],
                                list[index - 1],
                              ];
                              setForm({ ...form, categories: list });
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={used > 0}
                            aria-label={"Remove category " + name}
                            onClick={() =>
                              setForm({
                                ...form,
                                categories: form.categories.filter(
                                  (c) => c !== name,
                                ),
                                content: {
                                  ...form.content,
                                  categoryMeta:
                                    form.content.categoryMeta.filter(
                                      (c) => c.name !== name,
                                    ),
                                },
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  {[...new Set(catalog.posters.map((p) => p.category).filter(Boolean))]
                    .filter((c) => !form.categories.includes(c))
                    .map((name) => (
                      <div key={"unlisted-" + name}>
                        <b>{name}</b>
                        <small>
                          Used by{" "}
                          {catalog.posters.filter((p) => p.category === name).length}{" "}
                          posters but not in the category list
                        </small>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, categories: [...form.categories, name] })
                          }
                        >
                          Add to list ＋
                        </button>
                      </div>
                    ))}
                </div>
              </section>
            )}
            {section === "settings" && (
              <>
                <section className="admin-card">
                  <h2>Shop identity and contact</h2>
                  <label>
                    Shop name
                    <input
                      required
                      maxLength={100}
                      value={form.shop.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shop: { ...form.shop, name: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Shop tagline
                    <input
                      maxLength={300}
                      value={form.shop.tagline}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shop: { ...form.shop, tagline: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Instagram username
                    <input
                      required
                      maxLength={30}
                      value={form.shop.instagramUsername}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shop: {
                            ...form.shop,
                            instagramUsername: e.target.value.replace(/^@/, ""),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    WhatsApp number
                    <input
                      required
                      inputMode="tel"
                      maxLength={12}
                      pattern="91[6-9][0-9]{9}"
                      value={form.contact.whatsappNumber}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contact: {
                            ...form.contact,
                            whatsappNumber: e.target.value.replace(/\D/g, ""),
                          },
                        })
                      }
                    />
                  </label>
                  <p className="admin-caption">
                    Include country code 91. Current shop number: +91 75986
                    47185.
                  </p>
                  <label>
                    Shipping estimate
                    <input
                      required
                      maxLength={200}
                      value={form.contact.shippingDaysText}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contact: {
                            ...form.contact,
                            shippingDaysText: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </section>
                <section className="admin-card">
                  <h2>Order reply templates</h2>
                  <label>
                    WhatsApp reply template
                    <textarea
                      maxLength={1000}
                      value={form.contact.messageTemplates.whatsapp}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contact: {
                            ...form.contact,
                            messageTemplates: {
                              ...form.contact.messageTemplates,
                              whatsapp: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </label>
                  <p className="admin-caption">
                    Variables: {"{name}, {prints}, {size}, {total}"}. Customers
                    still send prepared messages themselves.
                  </p>
                </section>
                <section className="admin-card">
                  <h2>Payment and administrator access</h2>
                  <p className="admin-caption">
                    Razorpay keys and administrator roles are configured in
                    trusted backend settings. The panel cannot override verified
                    payment records.
                  </p>
                  <p>
                    Poster paper: <b>300 GSM matte</b>. Artwork remains
                    borderless.
                  </p>
                </section>
              </>
            )}
            {section === "offers" && (
              <section className="admin-card">
                <h2>Bundle offer requests</h2>
                <p className="admin-caption">
                  This offer appears for chat orders. The customer requests it
                  and the seller confirms the final amount. It does not change
                  Razorpay checkout prices.
                </p>
                <label className="admin-inline-check">
                  <input
                    type="checkbox"
                    checked={form.offers.bundleRule.enabled}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        offers: {
                          ...form.offers,
                          bundleRule: {
                            ...form.offers.bundleRule,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Show bundle offer
                </label>
                <label>
                  Minimum unique prints
                  <input
                    required
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    value={form.offers.bundleRule.minItems}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        offers: {
                          ...form.offers,
                          bundleRule: {
                            ...form.offers.bundleRule,
                            minItems: Number(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Requested discount (%)
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    value={form.offers.bundleRule.discountPercent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        offers: {
                          ...form.offers,
                          bundleRule: {
                            ...form.offers.bundleRule,
                            discountPercent: Number(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </label>
              </section>
            )}
          </fieldset>
        </form>
      )}
    </div>
  );
}
