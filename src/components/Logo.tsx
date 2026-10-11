import logo from "../imports/wall-stories-logo.webp"
import { shop } from "../data/shop"

/**
 * The source PNG is square with roughly 30% transparent margin above and below
 * the artwork. Scaling the image past the frame and clipping crops that dead
 * space away, so the mark fills the box it is given instead of floating in it.
 */
export default function Logo({
  className = "h-14 w-[74px]",
}: {
  className?: string
}) {
  return (
    <span
      className={`flex items-center justify-center overflow-hidden ${className}`}
    >
      <img
        src={logo}
        alt={`${shop.name} — ${shop.tagline}`}
        width={420} height={420} decoding="async"
        className="h-[146%] w-auto max-w-none object-contain"
      />
    </span>
  )
}
