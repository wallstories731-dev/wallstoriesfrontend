import { getSupabase, supabase } from "./client"
import { requireAdmin } from "./auth"
import { API_CONFIG } from "./config"
import { readJson, writeJson } from "./localStore"

// ─── Shop settings stored in Supabase (shop name, featured print, categories) ─

const TABLE = API_CONFIG.catalogTable
const SHOP_SETTINGS_ID = "shop_settings"

/** Save shop settings (name, tagline, instagram, currency) + featured + categories. */
export async function saveShopSettings(payload: unknown) {
  await requireAdmin()
  const { error } = await getSupabase()
    .from(TABLE)
    .upsert({ id: SHOP_SETTINGS_ID, data: payload }, { onConflict: "id" })
  if (error) throw error
}

/** Load shop settings from Supabase. Returns null if not set up yet. */
export async function loadShopSettings(): Promise<unknown | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", SHOP_SETTINGS_ID)
    .maybeSingle()
  if (error || !data) return null
  return data.data
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
