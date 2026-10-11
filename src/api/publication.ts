import { getSupabase, supabase } from "./client";
import { requireAdmin } from "./auth";
import {
  asRecord,
  normalizeCategories,
  normalizeFeatured,
  normalizeShop,
} from "./models";
import { normalizeSiteContent, normalizeOffers } from "./content";
import {
  DEFAULT_ADMIN_SETTINGS,
  saveAdminSettings,
  type AdminSettings,
} from "./settings";
import { shop, categories, featuredConfig } from "../data/shop";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "../data/siteContent";
import { DEFAULT_OFFERS, type OffersConfig } from "../data/offers";
export type SiteSettings = {
  revision: number;
  shop: typeof shop;
  categories: string[];
  featuredConfig: typeof featuredConfig;
  content: SiteContent;
  contact: AdminSettings;
  offers: OffersConfig;
};
export function normalizeSiteSettings(value: unknown): SiteSettings {
  const row = asRecord(value),
    contact = asRecord(row.contact),
    templates = asRecord(contact.messageTemplates);
  const text = (v: unknown, d: string, n = 1000) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, n) : d;
  const normalizedShop = normalizeShop(row.shop, shop);
  return {
    revision:
      Number.isSafeInteger(row.revision) && Number(row.revision) >= 0
        ? Number(row.revision)
        : 0,
    shop: normalizedShop,
    categories: normalizeCategories(row.categories, categories),
    featuredConfig:
      asRecord(row.featuredConfig).posterId === ""
        ? { posterId: "" }
        : normalizeFeatured(row.featuredConfig, featuredConfig),
    content: normalizeSiteContent(row.content || DEFAULT_SITE_CONTENT),
    offers: normalizeOffers(row.offers || DEFAULT_OFFERS),
    contact: {
      ...DEFAULT_ADMIN_SETTINGS,
      instagramHandle: "@" + normalizedShop.instagramUsername,
      whatsappNumber: /^91[6-9]\d{9}$/.test(String(contact.whatsappNumber))
        ? String(contact.whatsappNumber)
        : DEFAULT_ADMIN_SETTINGS.whatsappNumber,
      shippingDaysText: text(
        contact.shippingDaysText,
        DEFAULT_ADMIN_SETTINGS.shippingDaysText,
        200,
      ),
      messageTemplates: {
        instagram: text(
          templates.instagram,
          DEFAULT_ADMIN_SETTINGS.messageTemplates.instagram,
        ),
        whatsapp: text(
          templates.whatsapp,
          DEFAULT_ADMIN_SETTINGS.messageTemplates.whatsapp,
        ),
      },
    },
  };
}
export function defaultSiteSettings() {
  return normalizeSiteSettings({});
}
let published: Promise<SiteSettings | null> | undefined;
export function loadPublishedSettings() {
  if (!supabase) return Promise.resolve(null);
  if (!published)
    published = (async () => {
      const { data, error } = await getSupabase()
        .from("ws_posters")
        .select("data")
        .eq("id", "shop_settings")
        .maybeSingle();
      if (error) throw new Error("Shop settings could not be loaded.");
      if (!data) return null;
      const value = normalizeSiteSettings(data.data);
      saveAdminSettings(value.contact);
      return value;
    })().catch((e) => {
      published = undefined;
      throw e;
    });
  return published;
}
export async function loadAdminSiteSettings() {
  await requireAdmin();
  const { data, error } = await getSupabase()
    .from("ws_posters")
    .select("data")
    .eq("id", "shop_settings")
    .maybeSingle();
  if (error) throw new Error("Shop settings could not be loaded.");
  return normalizeSiteSettings(data?.data);
}
export async function saveAdminSiteSettings(next: SiteSettings) {
  await requireAdmin();
  if (!/^91[6-9]\d{9}$/.test(next.contact.whatsappNumber))
    throw new Error(
      "Enter a valid Indian WhatsApp number with country code 91.",
    );
  if (
    !/^(?=.*[A-Za-z0-9])[A-Za-z0-9._]{1,30}$/.test(next.shop.instagramUsername)
  )
    throw new Error("Enter a valid Instagram username without @.");
  if (!next.shop.name.trim()) throw new Error("Shop name is required.");
  if (next.content.faq.some((f) => !f.question.trim() || !f.answer.trim()))
    throw new Error("Each FAQ needs a question and an answer.");
  if (
    next.categories.length > 101 ||
    new Set(next.categories.map((c) => c.toLowerCase())).size !==
      next.categories.length
  )
    throw new Error("Categories must be unique.");
  if (
    next.offers.bundleRule.discountPercent < 0 ||
    next.offers.bundleRule.discountPercent > 100 ||
    !Number.isInteger(next.offers.bundleRule.minItems) ||
    next.offers.bundleRule.minItems < 1 ||
    next.offers.bundleRule.minItems > 30
  )
    throw new Error("Enter valid bundle offer values.");
  const value = normalizeSiteSettings(next);
  const { data, error } = await getSupabase().rpc("ws_save_site_settings", {
    p_data: value,
    p_expected_revision: next.revision,
  });
  if (error || !Number.isSafeInteger(data))
    throw new Error(
      "Changes were not published. Reload if another administrator edited them, and check that the settings migration is installed.",
    );
  const saved = { ...value, revision: data };
  published = Promise.resolve(saved);
  saveAdminSettings(saved.contact);
  return saved;
}
