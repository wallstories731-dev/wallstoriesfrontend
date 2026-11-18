import { useMemo } from "react";
import { Link } from "react-router";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import ArtworkImage from "../components/ArtworkImage";
import { useStore } from "../context/StoreContext";
import { useSiteContent } from "../context/SiteContentContext";
import { previewImage } from "../data/shop";

export default function CategoriesPage() {
  const { cartCount, posters, categories } = useStore();
  const { content } = useSiteContent();

  const cards = useMemo(() => {
    const live = posters.filter((p) => p.status !== "draft");
    const listed = categories.filter((c) => c !== "All");
    const extra = [...new Set(live.map((p) => p.category).filter(Boolean))]
      .filter((c) => !listed.includes(c))
      .sort();
    return [...listed, ...extra].map((name) => {
      const items = live.filter((p) => p.category === name);
      const meta = content.categoryMeta.find((m) => m.name === name);
      return { name, count: items.length, image: meta?.image || items[0]?.image || "" };
    });
  }, [posters, categories, content.categoryMeta]);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ground)" }}>
      <AnnouncementBar />
      <SiteNav cartCount={cartCount} bumped={false} onOpenCart={() => {}} />
      <main className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8 sm:py-20">
        <header className="mb-10">
          <p className="text-[11px] tracking-[0.28em] uppercase text-magenta">Browse by theme</p>
          <h1 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
            Categories
          </h1>
        </header>
        {cards.length === 0 ? (
          <p className="text-[14px] text-ink-soft">No categories yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <li key={c.name}>
                <Link
                  to={`/?category=${encodeURIComponent(c.name)}#catalogue`}
                  className="group block overflow-hidden rounded-[16px] border border-hairline bg-ground-soft transition hover:border-magenta"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-ground">
                    {c.image ? (
                      <ArtworkImage
                        src={previewImage(c.image, 480, 60)}
                        alt={c.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-content-center text-[28px] text-ink/20">✳</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-display text-[16px] font-semibold text-ink">{c.name}</h2>
                    <p className="mt-0.5 text-[12px] text-ink-soft">
                      {c.count} {c.count === 1 ? "print" : "prints"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
