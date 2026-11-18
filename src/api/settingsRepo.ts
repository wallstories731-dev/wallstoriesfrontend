import { getBackendClient } from "./backendClient"

const KEY = "site"

export type SettingsDoc = { data: Record<string, unknown> | null; revision: number }

/** GET /api/settings — public; data is null until the first publish. */
export async function fetchSettingsDoc(key = KEY): Promise<SettingsDoc> {
  const res = await getBackendClient().request<SettingsDoc>(`/api/settings?key=${encodeURIComponent(key)}`)
  if (!res.success || !res.data) throw new Error(res.message || "Shop settings could not be loaded.")
  return { data: res.data.data ?? null, revision: Number(res.data.revision) || 0 }
}

/** PUT /api/settings (admin) with optimistic locking; returns the new revision. */
export async function putSettingsDoc(
  data: Record<string, unknown>,
  expectedRevision: number,
  key = KEY,
): Promise<number> {
  const res = await getBackendClient().request<{ revision: number }>(
    `/api/settings?key=${encodeURIComponent(key)}`,
    { method: "PUT", body: JSON.stringify({ data, expectedRevision }) },
  )
  if (!res.success || !res.data) throw new Error(res.message || "Settings were not saved.")
  return Number(res.data.revision)
}
