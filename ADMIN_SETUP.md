# Admin panel

- Admin login: `/admin`
- Read-only preview: `/admin/preview/dashboard`
- Live sections: overview, posters, tags, categories, site content, orders, customers, photo reviews, offers and settings.
- Preview can open a read-only poster editor to inspect the controls.

The preview has sample orders/reviews and disabled mutations. It is a visual walkthrough and never grants administrator access. The public storefront still has its customer login at `/account`; a separate Admin login link is in the footer.

## Enable live management

No backend or administrator credentials have been configured on this Site. No default password exists. The sign-in form stays disabled until a merchant-owned backend is connected.

1. Configure the merchant-owned Supabase project and public frontend URL/key as described in README.md. Keep service-role and Razorpay secrets on the server.
2. Apply all included migrations in timestamp order, including `20261006020000_admin_catalog.sql` and `20261006030000_admin_site_settings.sql`. Deploy `admin-orders` and the payment functions using the existing exact-origin configuration in PAYMENTS.md.
3. Create a named administrator in Supabase Auth. Using trusted server/provider tooling, assign the **app metadata** claim `role: admin` to that specific account. Do not use user metadata or a customer-facing role picker. Customer signup cannot assign this role. Have the admin sign out and sign in again after changing the claim.
4. Rebuild and publish with the public backend configuration. Sign in at `/admin`. Sessions are memory-only; reloading the page requires another sign-in.
5. Before live use, test a customer denial, admin authorization, private draft access, revision conflicts, image upload, review approval/removal and paid-to-printed-to-shipped-to-delivered transitions against the actual database. Actual SQL, RLS, storage and rendered browser QA remain unverified here.

## Data and behavior

Catalog edits call an atomic database function. The full catalog and drafts live in an admin-only `admin_catalog` row, while only active posters are copied to the public `catalog` row. Concurrent updates compare a revision number; a stale save is rejected. No unsaved private drafts are stored in localStorage. The initial supplied catalog appears when a server catalog does not exist; an existing empty catalog stays empty.

The panel manages title, code, category, base and per-size prices/MRP, sizes, main artwork upload/URL, six gallery images, image description, description, orientation, badge, tags and visibility. Tags support add/remove in the editor and apply/rename/remove across the catalog. Poster selection supports bulk publication, drafts and confirmed deletion. Existing paid order snapshots remain intact when posters are deleted. CSV catalog, order and customer exports quote values and neutralize formula prefixes. Mark a poster as a draft to hide it without deleting its record. Saves confirm only after the server succeeds.

Orders show the latest 500 live online payment records. Test orders are excluded. WhatsApp/Instagram handoffs remain messages handled in those apps; they are not invented database orders. The admin can save courier/tracking data and private notes, cancel unpaid orders, and advance verified paid orders through fulfilment. Payment IDs, prices and paid state cannot be manually changed.

Photo moderation shows the latest 50 reviews, supports approval, and asks for confirmation before permanent review/photo removal. Failed saves retain edits and report errors. If an update succeeds but its subsequent refresh fails, reload before retrying.

Frontend connections are in `src/api/admin.ts`, `orders.ts`, `reviews.ts`, `auth.ts` and `storage.ts`. UI code contains no provider secrets or direct network calls.

## Published website controls

Content includes the announcement toggle/text, hero text/button/featured poster, catalog heading, footer description, About text, shipping/returns/privacy/help introductions and FAQ add/edit/remove/reorder. Categories can be added, reordered, and removed when unused; assign existing posters to another category before removing a used category. Shop controls cover name, tagline, Instagram, WhatsApp, shipping estimate and order reply template.

These changes publish to a public `shop_settings` row through the revision-checked `ws_save_site_settings` function. The storefront loads them on fresh visits; successful admin saves update the current storefront context immediately. No credentials or payment secrets belong in this public row. Failed publication leaves form edits in memory for retry. Discard changes and Reload settings are explicit controls; the browser warns before closing with unpublished edits.

The Offers section manages the existing manual chat bundle offer. It requests a seller-confirmed discount for WhatsApp/Instagram orders and does not discount Razorpay prices. This release does not introduce online coupon redemption, stock reservations, refunds, or administrator-role editing. Order delivery fields, courier, tracking and private notes remain server-validated; payment state is provider-verified. Customer lists derive from the latest 500 online orders, rather than claiming to list all Auth users.
