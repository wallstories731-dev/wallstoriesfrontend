import { useState } from "react"
import { CloseIcon } from "./icons"
import { useSiteContent } from "../context/SiteContentContext"

export default function AnnouncementBar() {
  const { content } = useSiteContent()
  const [dismissed, setDismissed] = useState(false)

  if (!content.announcement.enabled || dismissed) return null

  return (
    <div className="relative flex items-center justify-center bg-ink px-10 py-2.5 text-center">
      <p className="text-[11px] tracking-[0.18em] text-ground/90 uppercase">
        {content.announcement.text}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-ground/60 transition hover:text-ground"
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </div>
  )
}
