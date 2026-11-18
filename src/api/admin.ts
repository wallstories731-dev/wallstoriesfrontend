import { loadAdminSiteSettings, saveAdminSiteSettings } from "./publication";
import { requireAdmin } from "./auth";
import { loadAdminPosters, syncCatalog } from "./catalog";
import { stageImage } from "./imageStaging";
import { normalizePosters } from "./models";
import { validateRasterFile } from "./images";
import { loadAdminOrders, updateAdminOrder } from "./orders";
import { loadModerationReviews, approveReview, removeReview } from "./reviews";
import type { Poster } from "../data/shop";

export type AdminCatalog = { posters: Poster[]; revision: number };
export async function loadAdminCatalog(): Promise<AdminCatalog> {
  await requireAdmin();
  return { posters: await loadAdminPosters(), revision: 0 };
}
export async function saveAdminCatalog(
  catalog: AdminCatalog,
): Promise<AdminCatalog> {
  await requireAdmin();
  if (
    catalog.posters.some(
      (p) =>
        (p.tags || []).length > 20 ||
        (p.tags || []).some((t) => !t.trim() || t.length > 40),
    )
  )
    throw new Error("Use up to 20 tags per poster, each up to 40 characters.");
  if (catalog.posters.some((p) => (p.carouselImages || []).length > 6))
    throw new Error("Use up to six gallery images per poster.");
  const posters = normalizePosters(catalog.posters);
  if (new Set(posters.map((p) => p.code.toUpperCase())).size !== posters.length)
    throw new Error("Catalog codes must be unique.");
  if (posters.some((p) => p.basePrice > 500000))
    throw new Error("Poster prices must be at most ₹500,000.");
  if (posters.length !== catalog.posters.length || posters.length > 500)
    throw new Error(
      "Every poster needs a unique ID, valid image, price and sizes.",
    );
  try {
    await syncCatalog(posters, { prune: true });
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message
        ? e.message
        : "Catalog was not saved. Please retry.",
    );
  }
  return { posters: await loadAdminPosters(), revision: catalog.revision + 1 };
}
/** Images are staged locally and uploaded to the backend when the catalog is saved. */
export async function uploadAdminImage(file: File) {
  await validateRasterFile(file);
  return stageImage(file);
}
export const adminApi = {
  loadSettings: loadAdminSiteSettings,
  saveSettings: saveAdminSiteSettings,
  loadCatalog: loadAdminCatalog,
  saveCatalog: saveAdminCatalog,
  uploadImage: uploadAdminImage,
  loadOrders: loadAdminOrders,
  updateOrder: updateAdminOrder,
  loadReviews: loadModerationReviews,
  approveReview,
  removeReview,
};
export type AdminApi = typeof adminApi;
