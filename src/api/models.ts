import type { Poster, SizeKey } from "../data/shop";
import { isSafeImageUrl } from "./safety.ts";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function textValue(value: unknown, fallback: string, max = 100) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}
export function stringList(
  value: unknown,
  fallback: string[] = [],
  limit = 100,
) {
  if (!Array.isArray(value)) return [...fallback];
  return [
    ...new Set(
      value
        .filter(
          (item): item is string => typeof item === "string" && !!item.trim(),
        )
        .map((item) => item.trim().slice(0, 100)),
    ),
  ].slice(0, limit);
}
export function normalizeCategories(value: unknown, fallback: string[]) {
  const names = stringList(value, fallback);
  return ["All", ...names.filter((name) => name !== "All")];
}
export function normalizeShop<
  T extends {
    name: string;
    tagline: string;
    instagramUsername: string;
    currency: string;
  },
>(value: unknown, fallback: T): T {
  const row = asRecord(value),
    username = textValue(
      row.instagramUsername,
      fallback.instagramUsername,
      100,
    ).replace(/^@/, "");
  return {
    ...fallback,
    name: textValue(row.name, fallback.name),
    tagline: textValue(row.tagline, fallback.tagline, 300),
    instagramUsername: /^(?=.*[A-Za-z0-9])[A-Za-z0-9._]{1,30}$/.test(username)
      ? username
      : fallback.instagramUsername,
    currency: "₹",
  };
}
export function normalizeFeatured(
  value: unknown,
  fallback: { posterId: string },
) {
  const id = asRecord(value).posterId;
  return {
    posterId:
      typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id)
        ? id
        : fallback.posterId,
  };
}
export function normalizePosters(
  value: unknown,
  fallback: Poster[] = [],
): Poster[] {
  if (!Array.isArray(value)) return [...fallback];
  const sizes: SizeKey[] = ["A4", "A3", "A2", "12×18", "18×24"];
  const seen = new Set<string>(),
    result: Poster[] = [];
  for (const item of value.slice(0, 500)) {
    const row = asRecord(item);
    if (
      typeof row.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(row.id) ||
      seen.has(row.id) ||
      typeof row.title !== "string" ||
      !row.title.trim() ||
      typeof row.code !== "string" ||
      !row.code.trim() ||
      typeof row.category !== "string" ||
      !row.category.trim() ||
      !isSafeImageUrl(row.image) ||
      typeof row.basePrice !== "number" ||
      !Number.isFinite(row.basePrice) ||
      row.basePrice <= 0 ||
      (row.status !== undefined &&
        row.status !== "active" &&
        row.status !== "draft")
    )
      continue;
    const available = Array.isArray(row.sizes)
      ? sizes.filter((size) => (row.sizes as unknown[]).includes(size))
      : [];
    if (!available.length) continue;
    const overrides = asRecord(row.customPrices),
      customPrices: Poster["customPrices"] = {};
    let valid = true;
    for (const size of available) {
      if (overrides[size] === undefined) continue;
      const price = asRecord(overrides[size]);
      if (
        typeof price.price !== "number" ||
        !Number.isSafeInteger(price.price) ||
        price.price <= 0
      ) {
        valid = false;
        break;
      }
      customPrices[size] = {
        price: price.price,
        mrp:
          typeof price.mrp === "number" &&
          Number.isFinite(price.mrp) &&
          price.mrp >= price.price
            ? price.mrp
            : price.price,
      };
    }
    if (!valid) continue;
    seen.add(row.id);
    result.push({
      id: row.id,
      code: textValue(row.code, row.id),
      title: row.title.trim().slice(0, 200),
      category: row.category.trim().slice(0, 100),
      basePrice: row.basePrice,
      sizes: available,
      image: row.image,
      alt: textValue(row.alt, row.title, 300),
      description: textValue(row.description, "", 6000).replace(
        /250\s*gsm/gi,
        "300 GSM",
      ),
      added:
        typeof row.added === "number" && Number.isFinite(row.added)
          ? row.added
          : 0,
      badge:
        row.badge === "new" ||
        row.badge === "bestseller" ||
        row.badge === "few-left"
          ? row.badge
          : undefined,
      orientation: row.orientation === "square" ? "square" : "portrait",
      status: row.status === "draft" ? "draft" : "active",
      tags: stringList(row.tags, [], 20),
      featured: row.featured === true,
      customPrices,
      carouselImages: Array.isArray(row.carouselImages)
        ? [...new Set(row.carouselImages.filter(isSafeImageUrl))].slice(0, 6)
        : [],
    });
  }
  return value.length && !result.length && fallback.length
    ? [...fallback]
    : result;
}
