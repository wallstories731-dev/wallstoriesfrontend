const privateKeys = new Set(["ws_admin_orders_v1", "ws_enquiries_v1", "ws_sent_orders_v1", "ws_customer_notes_v1"])
const volatile = new Map<string, unknown>()
/**
 * Browser storage helpers (localStorage). UI code never calls localStorage
 * directly; it goes through these so storage can be swapped for a server later.
 */

export function readJson<T>(key: string, fallback: T): T {
  if (privateKeys.has(key)) { try { localStorage.removeItem(key) } catch {} return (volatile.get(key) as T) ?? fallback }
  try {
    if (typeof localStorage === "undefined") return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value = JSON.parse(raw)
    if (fallback !== null && (Array.isArray(fallback) ? !Array.isArray(value) : typeof fallback !== typeof value || (typeof fallback === "object" && (value === null || Array.isArray(value))))) return fallback
    return value as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  if (privateKeys.has(key)) { volatile.set(key, value); try { localStorage.removeItem(key) } catch {} return }
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

/** Simple on/off UI preference stored as "1" / "0". */
export function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === "1" } catch { return false }
}

export function writeFlag(key: string, value: boolean) {
  try { localStorage.setItem(key, value ? "1" : "0") } catch {}
}

export function clearPrivateDrafts() { volatile.clear(); for (const key of privateKeys) { try { localStorage.removeItem(key) } catch {} } }
