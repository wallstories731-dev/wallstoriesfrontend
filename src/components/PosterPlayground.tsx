import { useSiteContent } from "../context/SiteContentContext";
import { DEFAULT_COPY } from "../data/siteContent";
import ArtworkImage from "./ArtworkImage";
import { useEffect, useState, type CSSProperties } from "react";
import { formatMoney, priceFor, type Poster } from "../data/shop";
import { useStore } from "../context/StoreContext";

const walls = [
  { name: "Logo yellow", color: "#ffe719", ink: "#2d183f" },
  { name: "Logo purple", color: "#51316d", ink: "#ffffff" },
  { name: "Logo pink", color: "#ce0076", ink: "#ffffff" },
  { name: "Soft lilac", color: "#e6d5f5", ink: "#2d183f" },
];
function contrast(color: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#2d183f"
    : "#ffffff";
}
export default function PosterPlayground({
  featured,
  onOpen,
}: {
  featured: Poster | null;
  onOpen: (p: Poster) => void;
}) {
  const { posters } = useStore();
  const { content } = useSiteContent();
  const copy = { ...DEFAULT_COPY, ...content.copy };
  const [wall, setWall] = useState(walls[0]);
  const [pick, setPick] = useState<Poster | null>(null);
  const [announce, setAnnounce] = useState("");
  const current = pick || featured;
  useEffect(() => {
    if (pick && !posters.some((p) => p.id === pick.id && p.status !== "draft"))
      setPick(null);
  }, [posters, pick]);
  function paint(next: typeof wall) {
    setWall(next);
    setAnnounce("Wall colour changed to " + next.name + ".");
  }
  function surprise() {
    const list = posters.filter(
      (p) => p.status !== "draft" && p.id !== current?.id,
    );
    if (!list.length) return;
    const chosen = list[Math.floor(Math.random() * list.length)];
    setPick(chosen);
    setAnnounce("Meet " + chosen.title + ". A fresh pick for your wall.");
  }
  return (
    <section className="playground-hero">
      <div className="playground-copy">
        <p className="playground-kicker">
          <span /> {copy.heroKicker}
        </p>
        <h1>
          {copy.heroTitle}
          <br />
          <span>{copy.heroHighlight}</span>
          <i aria-hidden="true">✳</i>
        </h1>
        <p className="playground-intro">
          {copy.heroIntro.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < copy.heroIntro.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="playground-actions">
          <a href="#catalogue" className="funk-button">
            {copy.heroCta} <span aria-hidden="true">↘</span>
          </a>
          <button onClick={surprise} className="surprise-button">
            ✦ Surprise me
          </button>
        </div>
        <div className="playground-footnote">
          <span>300 GSM matte</span>
          <b>✳</b>
          <span>Five sizes</span>
          <b>✳</b>
          <span>Printed to order</span>
        </div>
      </div>
      <div
        className="wall-preview colour-wall"
        style={
          {
            backgroundColor: wall.color,
            "--wall-ink": wall.ink,
          } as CSSProperties
        }
      >
        <span className="preview-label">YOUR WALL, BUT BETTER ↘</span>
        <span className="preview-star" aria-hidden="true">
          ✳
        </span>
        <div className="preview-frame poster-frame">
          {current ? (
            <button
              onClick={() => onOpen(current)}
              aria-label={"View wall preview of " + current.title}
            >
              <ArtworkImage
                src={current.image}
                alt={current.alt}
                fetchPriority="high"
              />
            </button>
          ) : (
            <span>Art lives here.</span>
          )}
        </div>
        <span className="preview-sticker">
          A little art.
          <br />A lot of feeling.
        </span>
        <div
          className="wall-controls colour-controls"
          role="group"
          aria-label="Wall colour"
        >
          <span>Try a wall colour</span>
          <div>
            {walls.map((w) => (
              <button
                key={w.name}
                style={{ backgroundColor: w.color }}
                aria-label={w.name}
                aria-pressed={wall.color === w.color}
                onClick={() => paint(w)}
                className={wall.color === w.color ? "selected" : ""}
              />
            ))}
            <label
              className="custom-wall-colour"
              title="Choose your own wall colour"
            >
              <input
                type="color"
                value={wall.color}
                aria-label="Custom wall colour"
                onChange={(e) => {
                  const color = e.target.value;
                  if (/^#[\da-f]{6}$/i.test(color))
                    paint({
                      name: "Custom " + color.toUpperCase(),
                      color,
                      ink: contrast(color),
                    });
                }}
              />
              <span aria-hidden="true">+</span>
            </label>
          </div>
        </div>
        {current && (
          <button className="preview-caption" onClick={() => onOpen(current)}>
            <span>
              {current.title}
              <small>
                from {formatMoney(priceFor(current, current.sizes[0]))}
              </small>
            </span>
            <span>↗</span>
          </button>
        )}
      </div>
      <span role="status" className="sr-only">
        {announce}
      </span>
    </section>
  );
}
