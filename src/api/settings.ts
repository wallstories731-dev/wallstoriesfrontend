import { readJson, writeJson } from "./localStore"
import { fetchSettingsDoc, putSettingsDoc } from "./settingsRepo"

// ─── Shop settings stored in the backend (/api/settings) ─────────────────────

/** Save shop settings (name, tagline, instagram, currency) + featured + categories. */
export async function saveShopSettings(payload: unknown) {
  const { data, revision } = await fetchSettingsDoc()
  // Merge so sections owned by other editors (content, offers, contact) survive.
  await putSettingsDoc({ ...(data ?? {}), ...(payload as Record<string, unknown>) }, revision)
}

/** Load shop settings from the backend. Returns null if not published yet. */
export async function loadShopSettings(): Promise<unknown | null> {
  try {
    return (await fetchSettingsDoc()).data
  } catch {
    return null
  }
}

// ─── Admin settings (contact + message templates), saved in this browser ─────

const ADMIN_SETTINGS_KEY = "ws_shop_settings_v1"

export type AdminSettings = {
  instagramHandle: string
  whatsappNumber: string
  shippingDaysText: string
  frameOptionsEnabled: boolean
  messageTemplates: { instagram: string; whatsapp: string }
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  instagramHandle: "@thewallstories_2026",
  whatsappNumber: "917598647185",
  shippingDaysText: "Ships in 4–6 business days",
  frameOptionsEnabled: true,
  messageTemplates: {
    instagram: "Hi! I saw your print enquiry. Let me help you out 🙂 Which print are you interested in?",
    whatsapp: "Hi {name}! 👋 Thanks for your enquiry for *{prints}*. Here are the details:\n\n📦 Size: {size}\n💰 Total: ₹{total}\n\nShall we confirm your order?",
  },
}

export function loadAdminSettings(): AdminSettings {
  const saved = readJson<Partial<AdminSettings>>(ADMIN_SETTINGS_KEY, {})
  // Apply the owner's contact update once while retaining other saved settings.
  const revision="ws_contact_update_20261006"
  if(!readJson(revision,false)){
    saved.whatsappNumber=DEFAULT_ADMIN_SETTINGS.whatsappNumber
    writeJson(ADMIN_SETTINGS_KEY,saved)
    writeJson(revision,true)
  }
  return { ...DEFAULT_ADMIN_SETTINGS, ...saved }
}

export function saveAdminSettings(s: AdminSettings) {
  writeJson(ADMIN_SETTINGS_KEY, s)
}

/**
 * Single source of truth for the order WhatsApp number and reply template.
 * Everything in the app (cart, footer, contact page, admin) reads it here.
 */
export function getContactSettings() {
  const s = loadAdminSettings()
  const whatsappNumber =
    (typeof s.whatsappNumber === "string" ? s.whatsappNumber.replace(/\D/g, "") : "")
  const whatsappTemplate =
    s.messageTemplates?.whatsapp || DEFAULT_ADMIN_SETTINGS.messageTemplates.whatsapp
  return { whatsappNumber: /^91[6-9]\d{9}$/.test(whatsappNumber) ? whatsappNumber : DEFAULT_ADMIN_SETTINGS.whatsappNumber, whatsappTemplate:typeof whatsappTemplate === "string" ? whatsappTemplate : DEFAULT_ADMIN_SETTINGS.messageTemplates.whatsapp }
}
