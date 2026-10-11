import { asRecord, textValue, stringList } from "./models";
import { isSafeImageUrl } from "./safety";
import {
  DEFAULT_SITE_CONTENT,
  DEFAULT_COPY,
  type SiteContent,
} from "../data/siteContent";
import { DEFAULT_OFFERS, type OffersConfig } from "../data/offers";
import { readJson, writeJson } from "./localStore";

// ─── Site content (announcement, hero, FAQ, category cards) ──────────────────

const SITE_CONTENT_KEY = "ws_site_content_v1";

export function loadSiteContent(): SiteContent {
  return normalizeSiteContent(readJson<unknown>(SITE_CONTENT_KEY, null));
}
export function normalizeSiteContent(value: unknown): SiteContent {
  const saved = asRecord(value);
  const announcement = asRecord(saved.announcement),
    hero = asRecord(saved.hero);
  const faq = Array.isArray(saved.faq)
    ? saved.faq
        .flatMap((value, index) => {
          const item = asRecord(value);
          return typeof item.question === "string" &&
            item.question.trim() &&
            typeof item.answer === "string"
            ? [
                {
                  id: textValue(item.id, "faq-" + index),
                  question: item.question.slice(0, 300),
                  answer: item.answer
                    .slice(0, 6000)
                    .replace(/250\s*gsm/gi, "300 GSM"),
                },
              ]
            : [];
        })
        .slice(0, 50)
    : DEFAULT_SITE_CONTENT.faq;
  const categoryMeta = Array.isArray(saved.categoryMeta)
    ? saved.categoryMeta
        .flatMap((value) => {
          const item = asRecord(value);
          return typeof item.name === "string" && item.name.trim()
            ? [
                {
                  name: item.name.trim().slice(0, 100),
                  order:
                    typeof item.order === "number" &&
                    Number.isFinite(item.order)
                      ? item.order
                      : 0,
                  image: isSafeImageUrl(item.image) ? item.image : undefined,
                },
              ]
            : [];
        })
        .slice(0, 100)
    : DEFAULT_SITE_CONTENT.categoryMeta;
  return {
    announcement: {
      enabled:
        typeof announcement.enabled === "boolean"
          ? announcement.enabled
          : DEFAULT_SITE_CONTENT.announcement.enabled,
      text: textValue(
        announcement.text,
        DEFAULT_SITE_CONTENT.announcement.text,
        1000,
      ).replace(/250\s*gsm/gi, "300 GSM"),
    },
    hero: {
      featuredPosterIds: stringList(
        hero.featuredPosterIds,
        DEFAULT_SITE_CONTENT.hero.featuredPosterIds,
        3,
      ),
    },
    faq,
    categoryMeta,
    copy: Object.fromEntries(
      Object.entries(DEFAULT_COPY).map(([key, fallback]) => [
        key,
        typeof asRecord(saved.copy)[key] === "string"
          ? String(asRecord(saved.copy)[key])
              .slice(0, 6000)
              .replace(/250\s*gsm/gi, "300 GSM")
          : fallback,
      ]),
    ),
  };
}

export function saveSiteContent(content: SiteContent) {
  writeJson(SITE_CONTENT_KEY, content);
}

// ─── Offers (bundle rule + coupons) ──────────────────────────────────────────

const OFFERS_KEY = "ws_offers_v1";

export function loadOffers(): OffersConfig {
  return normalizeOffers(readJson<unknown>(OFFERS_KEY, null));
}
export function normalizeOffers(value: unknown): OffersConfig {
  const parsed = asRecord(value),
    rule = asRecord(parsed.bundleRule);
  const finitePercent = (value: unknown) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100;
  const coupons = Array.isArray(parsed.coupons)
    ? parsed.coupons
        .flatMap((value) => {
          const coupon = asRecord(value);
          if (
            typeof coupon.id !== "string" ||
            typeof coupon.code !== "string" ||
            !coupon.code.trim() ||
            !finitePercent(coupon.discountPercent)
          )
            return [];
          return [
            {
              id: coupon.id.slice(0, 100),
              code: coupon.code.trim().toUpperCase().slice(0, 40),
              discountPercent: coupon.discountPercent as number,
              enabled: coupon.enabled === true,
              usedCount:
                typeof coupon.usedCount === "number" &&
                Number.isSafeInteger(coupon.usedCount) &&
                coupon.usedCount >= 0
                  ? coupon.usedCount
                  : 0,
              expiresAt:
                typeof coupon.expiresAt === "number" &&
                Number.isFinite(coupon.expiresAt)
                  ? coupon.expiresAt
                  : undefined,
              usageLimit:
                typeof coupon.usageLimit === "number" &&
                Number.isSafeInteger(coupon.usageLimit) &&
                coupon.usageLimit >= 0
                  ? coupon.usageLimit
                  : undefined,
              description: textValue(coupon.description, "", 300),
            },
          ];
        })
        .slice(0, 100)
    : DEFAULT_OFFERS.coupons;
  return {
    bundleRule: {
      enabled:
        typeof rule.enabled === "boolean"
          ? rule.enabled
          : DEFAULT_OFFERS.bundleRule.enabled,
      minItems:
        typeof rule.minItems === "number" &&
        Number.isInteger(rule.minItems) &&
        rule.minItems >= 1 &&
        rule.minItems <= 30
          ? rule.minItems
          : DEFAULT_OFFERS.bundleRule.minItems,
      discountPercent: finitePercent(rule.discountPercent)
        ? (rule.discountPercent as number)
        : DEFAULT_OFFERS.bundleRule.discountPercent,
    },
    coupons,
  };
}

export function saveOffers(config: OffersConfig) {
  writeJson(OFFERS_KEY, config);
}

// ─── Customer notes (admin) ──────────────────────────────────────────────────

const CUSTOMER_NOTES_KEY = "ws_customer_notes_v1";

export function loadCustomerNotes(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(CUSTOMER_NOTES_KEY, {});
}

export function saveCustomerNotes(notes: Record<string, string[]>) {
  writeJson(CUSTOMER_NOTES_KEY, notes);
}
