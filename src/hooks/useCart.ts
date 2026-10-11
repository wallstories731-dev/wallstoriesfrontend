import { useCallback, useEffect, useState } from "react"
import { readJson, writeJson, normalizeCart } from "../api"
import {
  formatMoney,
  posters,
  previewImage,
  priceFor,
  type Poster,
  type SizeKey,
} from "../data/shop"

export type CartLine = {
  posterId: string
  size: SizeKey
  qty: number
}

const STORAGE_KEY = "sps.selection.v1"

function load(): CartLine[] {
  const parsed = readJson<unknown>(STORAGE_KEY, [])
  return normalizeCart(parsed)
}

const keyOf = (line: { posterId: string; size: SizeKey }) =>
  `${line.posterId}::${line.size}`

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(load)

  useEffect(() => {
    writeJson(STORAGE_KEY, lines)
  }, [lines])

  const add = useCallback((posterId: string, size: SizeKey, qty = 1) => {
    setLines((prev) => {
      const idx = prev.findIndex(
        (l) => l.posterId === posterId && l.size === size,
      )
      if (idx === -1) return [...prev, { posterId, size, qty }]
      const next = [...prev]
      next[idx] = { ...next[idx], qty: next[idx].qty + qty }
      return next
    })
  }, [])

  const setQty = useCallback((posterId: string, size: SizeKey, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !(l.posterId === posterId && l.size === size))
        : prev.map((l) =>
            l.posterId === posterId && l.size === size ? { ...l, qty } : l,
          ),
    )
  }, [])

  const remove = useCallback((posterId: string, size: SizeKey) => {
    setLines((prev) =>
      prev.filter((l) => !(l.posterId === posterId && l.size === size)),
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const detailed = lines.flatMap((line) => {
    const poster = posters.find((p) => p.id === line.posterId)
    if (!poster) return []
    const unit = priceFor(poster, line.size)
    return [
      { ...line, key: keyOf(line), poster, unit, subtotal: unit * line.qty },
    ]
  })

  const count = detailed.reduce((n, l) => n + l.qty, 0)
  const total = detailed.reduce((n, l) => n + l.subtotal, 0)

  const qtyOf = (poster: Poster, size: SizeKey) =>
    lines.find((l) => l.posterId === poster.id && l.size === size)?.qty ?? 0

  return { lines: detailed, count, total, add, setQty, remove, clear, qtyOf }
}

export type DetailedLine = ReturnType<typeof useCart>["lines"][number]

export function buildOrderText(
  lines: DetailedLine[],
  count: number,
  total: number,
  name: string,
  note: string,
) {
  const items = lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.poster.code} — ${l.poster.title} — ${l.size} — x${l.qty} — ${formatMoney(l.subtotal)}`,
    )
    .join("\n")

  // Image links let the seller see exactly which print each line refers to,
  // even when the chat carries no attachments.
  const links = lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.poster.code} ${l.poster.title} → ${l.poster.image}`,
    )
    .join("\n")

  return [
    "Hi! Here's my poster order 🖼️",
    "",
    items,
    "",
    `Total items: ${count}`,
    `Estimated total: ${formatMoney(total)}`,
    "",
    `Name: ${name.trim() || "—"}`,
    `Note: ${note.trim() || "—"}`,
    "",
    "Posters:",
    links,
  ].join("\n")
}

const slug = (s: string) =>
  s.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export { posterFiles } from "../api/media"

export type ShareResult = "shared" | "downloaded" | "cancelled" | "failed"

/**
 * Instagram's DM deep link cannot carry attachments, so images travel through the
 * OS share sheet instead — on a phone that lists Instagram directly. Where the
 * share sheet is unavailable (most desktops) the images are saved to disk so they
 * can be dragged into the chat by hand.
 *
 * `files` should be prefetched before the click: Safari only honours share() while
 * the user gesture is still live, and awaiting a fetch first loses it.
 */
export async function sharePosterImages(
  files: File[],
  text: string,
): Promise<ShareResult> {
  if (files.length === 0) return "failed"

  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text })
      return "shared"
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError")
        return "cancelled"
      // Fall through to the download path on any other share failure.
    }
  }

  for (const file of files) {
    const url = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  return "downloaded"
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API blocked (non-secure context / permissions) — fall back.
    const el = document.createElement("textarea")
    el.value = text
    el.setAttribute("readonly", "")
    el.style.position = "fixed"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.select()
    let ok = false
    try {
      ok = document.execCommand("copy")
    } catch {
      ok = false
    }
    document.body.removeChild(el)
    return ok
  }
}
