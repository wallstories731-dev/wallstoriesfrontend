import { CustomerAuthProvider } from "../src/context/CustomerAuthContext";
import App from "../src/App";
import { StoreProvider } from "../src/context/StoreContext";
import { OffersProvider } from "../src/context/OffersContext";
import { SiteContentProvider } from "../src/context/SiteContentContext";
export { router } from "../src/routes";
export {
  validateReview,
  validateReviewPhoto,
  subscribePhotoReviews,
} from "../src/api/reviews";
export { openRazorpay, PaymentCancelled } from "../src/api/payments";
export { posters, priceFor, formatMoney } from "../src/data/shop";
export { default as useModal } from "../src/hooks/useModal";
export function TestApp() {
  return (
    <CustomerAuthProvider>
      <OffersProvider>
        <SiteContentProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </SiteContentProvider>
      </OffersProvider>
    </CustomerAuthProvider>
  );
}

import { MemoryRouter } from "react-router";
import { AdminAuthProvider } from "../src/context/AdminAuthContext";
import AdminWorkspace from "../src/pages/admin/AdminWorkspace";
import type { AdminApi } from "../src/api/admin";
export { sampleAdminData } from "../src/pages/admin/AdminWorkspace";
export function TestAdminWorkspace({
  api,
  path = "/admin/dashboard",
}: {
  api: AdminApi;
  path?: string;
}) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <SiteContentProvider>
        <OffersProvider>
          <StoreProvider>
            <AdminAuthProvider>
              <AdminWorkspace api={api} />
            </AdminAuthProvider>
          </StoreProvider>
        </OffersProvider>
      </SiteContentProvider>
    </MemoryRouter>
  );
}

export {
  defaultSiteSettings,
  normalizeSiteSettings,
} from "../src/api/publication";
