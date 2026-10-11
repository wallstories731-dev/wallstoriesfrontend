import { loadAdminSiteSettings, saveAdminSiteSettings } from "./publication";
import { requireAdmin } from "./auth";
import { getSupabase } from "./client";
import { normalizePosters } from "./models";
import { validateRasterFile } from "./images";
import { uploadImage } from "./storage";
import { loadAdminOrders, updateAdminOrder } from "./orders";
import { loadModerationReviews, approveReview, removeReview } from "./reviews";
import { posters as seedPosters, type Poster } from "../data/shop";

export type AdminCatalog = { posters: Poster[]; revision: number };
export async function loadAdminCatalog(): Promise<AdminCatalog> {
  await requireAdmin();
  const { data, error } = await getSupabase()
    .from("ws_posters")
    .select("id,data")
    .in("id", ["admin_catalog", "catalog"]);
  if (error) throw new Error("Catalog could not be loaded. Please retry.");
  const privateRow = data?.find((row) => row.id === "admin_catalog");
  if (privateRow) {
    if (
      !Number.isSafeInteger(privateRow.data?.revision) ||
      !Array.isArray(privateRow.data?.posters)
    )
      throw new Error(
        "Catalog data needs attention. Contact your administrator.",
      );
    const posters = normalizePosters(privateRow.data.posters);
    if (posters.length !== privateRow.data.posters.length)
      throw new Error(
        "Catalog contains invalid records. Repair them before publishing.",
      );
    return { posters, revision: privateRow.data.revision };
  }
  const published = data?.find((row) => row.id === "catalog");
  return {
    posters: normalizePosters(published ? published.data : seedPosters),
    revision: 0,
  };
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
  const { data, error } = await getSupabase().rpc("ws_save_admin_catalog", {
    p_posters: posters,
    p_expected_revision: catalog.revision,
  });
  if (error || !Number.isSafeInteger(data))
    throw new Error(
      "Catalog was not saved. Reload if another administrator edited it, and check that the admin migration is installed.",
    );
  return { posters, revision: data };
}
export async function uploadAdminImage(file: File) {
  await validateRasterFile(file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Image could not be read."));
    r.readAsDataURL(file);
  });
  return uploadImage(dataUrl);
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
