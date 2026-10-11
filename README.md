# Wall Stories — Good walls. Great vibes.

Updated React + Vite poster shop. The storefront includes live search, category and
size filters, wishlist, size picking, cart, color-switching wall preview, random
poster discovery, responsive cards, and reduced-motion support. Existing secondary
pages remain available. The brand palette uses logo yellow, purple and pink.
Paper specifications use 300 GSM; WhatsApp orders go to +91 75986 47185.

## Run the project

Use Node 24+ and pnpm 11+. From this folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm run typecheck
pnpm test
pnpm build
```

`dist/` is a static production build. Configure your host to serve `index.html` for
SPA routes (for example `/print/neon-tokyo`). API handlers are deployed separately to
Supabase; uploading `dist/` alone does not deploy the backend.

Without environment values, the shop displays its sample catalog and supports local
cart, wishlist, wall colors and chat enquiries. It does not connect to the original
bundled Supabase project. Online payments, customer sign-in and review submissions are unavailable until configured. Customer and admin login are separate; admin preview is available without backend credentials.

## API connections stay separate

Copy root `.env.example` to a local `.env`. Add your **public** Supabase URL and publishable key
(or the legacy anon key). The browser adapters live in `src/api/`. Payment secrets belong
only in Supabase function secrets; see `supabase/.env.example` and `PAYMENTS.md`.
The Vite build rejects privileged Supabase keys and VITE_* secret variables. Never use a service-role key in `VITE_*`. See `src/api/README.md` for the file map.

## Activate the secured backend

1. Use your own Supabase project. Run all SQL migrations in timestamp order.
   The security migration replaces policies on the two dedicated app tables and
   adds restrictive write guards for `poster-images`. Review existing table/bucket
   use before applying it to a shared database. The default bucket is `poster-images`;
   if changing it, change the migration and environment value together.
2. Enable the admin panel at /admin using ADMIN_SETUP.md. For authorized shop
   management, grant `app_metadata.role = "admin"` to the named admin account
   through trusted provider tooling.
   Do not use `user_metadata`, a localStorage flag, or a browser-set claim.
3. Deploy all four function folders, including `_shared` imports:
   `create-razorpay-order`, `verify-razorpay-payment`, `razorpay-webhook`, `admin-orders`.
4. Enable Supabase anonymous sign-ins for checkout identity; enable CAPTCHA/abuse
   protection in the Supabase settings and apply edge rate limits for your storefront.
   Checkout already limits reservations by identity and globally, but anonymous
   identities can be recreated and those limits do not replace provider abuse controls.
5. Set `ALLOWED_ORIGINS` to your exact deployed storefront origin(s).
6. Publish active catalog items using the authorized admin poster editor.
   Then follow `PAYMENTS.md` for Razorpay test-mode verification before activating
   live payments.

## Important behavior

- Customer details, temporary receipts and customer-note drafts are no longer
  persisted to localStorage. Online orders come from the server. Old sensitive
  browser keys are removed. Customer sessions do not survive a page reload.
- Chat enquiries and copied orders are temporary client drafts, not durable server
  orders. No chat is sent automatically. The customer must submit it in the chat app.
- Non-sensitive catalog/content preferences are validated before rendering. Invalid
  cached records recover safely; an empty published catalog stays empty. Historical
  back-office source is retained but is not routed or loaded by the public app.
  Local drafts are not a shared CMS. No client-only coupons or shipping fees affect
  online totals.
- Fulfillment statuses move only from verified paid → printed → shipped → delivered.
  Browser edits cannot set an order paid, change charged totals, or delete payment
  records. Refunds and offline payment reconciliation are provider/back-office tasks.
- Server totals use published custom size prices when present; otherwise the size
  multiplier. Catalog drafts are excluded from publication.
- The security fixes in the archive are not applied to an existing live database
  until its migrations and functions are deployed. No credentials were supplied,
  so no live payment was attempted.

Validation and remaining limitations are recorded in `SECURITY_NOTES.md`.

`public/_headers` supplies recommended headers for hosts that support that format.
On other hosts set them in the hosting configuration. Test the CSP with Razorpay
in staging (and add your exact custom Supabase domain if using one). This policy
prevents framing; adjust `frame-ancestors` for a specific preview host if required.

## UI validation

Twenty-seven DOM interaction tests cover search navigation, filters, modal focus and Escape,
cart quantities and validation, wishlist, artwork fallback, secondary-page navigation,
custom uploads and enquiry handoff, gallery-set price parity, privacy/tracking routes,
300 GSM copy and the configured WhatsApp link. These do not replace visual browser QA.
See UIUX_NOTES.md and VALIDATION.json.

## New storefront interactions

- A Pay Online card is visible for non-empty selections. It uses the existing secured Razorpay adapters when configured; otherwise it explains checkout availability without taking a payment or clearing the cart.
- Review cards scroll at a constant speed, pause on hover/focus or with the pause control, and stay still for reduced-motion preferences. The bundled testimonials are explicitly labeled sample preview content.
Original Poster Pairs footer game restored: eight tiles, four matching pairs, move counter and restart, using the storefront brand palette.

Live online payments still require the setup in PAYMENTS.md. Secret keys remain server-side.

## Customer accounts and photo reviews

- The hero changes only the wall colour: four brand presets and a custom colour picker. Poster discovery and product details remain available.
- Customer login, registration, password reset and password change are at /account.
- Customer login remains at /account. The footer links to the separate, role-protected /admin login and read-only /admin/preview/dashboard. See ADMIN_SETUP.md to enable live management.
- The photo gallery labels bundled room images and testimonials as samples. Customers can preview photos locally. Signed-in customers can submit a photo, a rating and a review with explicit public-display consent. New submissions are private until an administrator approves them.

To enable these connections:

1. Apply supabase/migrations/20261006010000_customer_reviews.sql after the earlier migrations. It creates ws_reviews and a private review-photos bucket with 5 MB raster MIME limits, owner paths, RLS, column privileges and administrator moderation. The submission trigger allows up to three stored reviews per account in 24 hours. Deleted reviews no longer count; these per-account limits do not replace provider rate limits or upload abuse controls.
2. Set the public Supabase variables from .env.example, enable email/password Auth and email confirmation, and set the provider's minimum password length to at least 12. Configure CAPTCHA and rate limits for account creation, password reset and storage uploads.
3. In Supabase Auth URL Configuration, allow the exact deployed /account URL for confirmation and recovery links. Configure email delivery and test both flows in staging. This memory-only client uses the provider's implicit link flow and consumes tokens on /account, removes them from the URL and verifies the user with the provider.
4. Approve or remove pending reviews through trusted Supabase dashboard/server tooling. Keep moderation privileges separate from customer signup; a customer cannot grant themselves the trusted app_metadata.role = "admin" claim.
5. Test public versus pending access, owner isolation, signed photo URLs, failed uploads and moderation against the configured backend before accepting real submissions.

No live account provider or database was configured during this update. The preview gives accurate unavailable feedback and cannot create accounts or submit reviews until setup is complete. API requests remain in src/api/customerAuth.ts and src/api/reviews.ts.

## Order sharing and Razorpay

WhatsApp orders are addressed to +91 75986 47185 with the prepared message in the link. Instagram opens the configured shop DM and copies the order for the customer to paste and send; a visible message remains available if clipboard permission is blocked. Prepared messages include quantities, sizes, unit prices, line subtotals, a reference, 300 GSM paper, contact details and notes. Shipping and final chat prices are explicitly subject to seller confirmation. The cart remains available for editing and sharing again.

Razorpay is the online payment provider. Checkout creates a reserved order on the server, opens Razorpay, verifies the returned proof and captured payment, and clears the cart only after verified success. Cancelled or failed checkout keeps the cart and shows the reference. Provider test payments get test receipts; new test-mode orders are marked by the server, excluded from normal order/revenue views, and blocked from fulfillment. Inspect them in the test database during staging validation. Keep staging and live databases and keys separate.

Production checkout remains unavailable until the merchant keys and Supabase functions are configured. Complete the setup and real-provider test in PAYMENTS.md; no live payment was attempted.

## Final release audit

Product artwork is borderless, including catalog cards, hero previews, product details, related prints, sets, selection/search/wishlist thumbnails, custom previews and game prints. The hero's chosen wall colour remains adjustable; poster images receive no colour filters or blending. Selection indicators and keyboard focus outlines remain visible. Room photographs retain their original appearance.

Custom enquiries validate the name and Indian phone number, include a random reference, 300 GSM paper, exact quantity and estimated subtotal, and work through WhatsApp or Instagram. Both paths keep a visible prepared message and require the customer to attach the original artwork and send the chat. Invalid uploads cannot preserve an earlier preview; reset releases the object URL and clears the input. Image-quality warnings use the weaker dimension of the selected print.

The release passed 40 DOM interaction tests, 17 security/server/readiness/admin-auth/control tests, frontend/server TypeScript, a production build and a dependency audit with zero reported advisories. A negative build test confirmed private Supabase keys fail before assets are bundled. See RELEASE_REPORT.md and VALIDATION.json for scope and outstanding live-service work.

Browser-key guidance: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys). Payment setup and staging expectations: [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

## Admin shop studio

The new admin dashboard manages posters, verified online order fulfilment and customer photo moderation. It includes a clearly labeled read-only preview. Live login requires the merchant-owned backend and an authorized admin app-metadata role; no default credentials or client-side bypass exist. ADMIN_SETUP.md covers activation and the private draft catalog migration.

Admin controls now include full poster editing and bulk actions, tag add/rename/remove, category management, published website content, customer/order exports, chat bundle offers and shop/contact settings. Published content is shared through the backend and loaded by storefront providers. Apply the new settings migration from ADMIN_SETUP.md. The read-only preview includes a poster editor walkthrough.
