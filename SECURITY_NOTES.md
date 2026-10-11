# Review and validation — 6 October 2026

This is a source review and targeted repair of the uploaded project, not a claim
that the deployed application is vulnerability-free.

| Finding | Change |
| --- | --- |
| Hardcoded browser password and alternate passcode login | Removed both; verified Supabase Auth admin app_metadata claim |
| Forged browser session flag | Removed; memory-only Supabase sessions and server getUser authorization |
| Missing catalog/upload access boundaries | New RLS migration and restrictive storage write guards |
| Public database project/key bundled as fallback | Removed; configuration is opt-in through environment files |
| Signature alone treated as paid | Fetch capture status and match stored order, amount, currency and buyer |
| Duplicate/out-of-order payment updates | Row lock, unique payment ID, owner binding, bounded transitions |
| Webhook returned success after failed persistence | Retries with 503 until reconciliation succeeds |
| Wildcard browser CORS and unlimited payload fields | Exact origin allowlist, bounded body reads and strict validation |
| Pricing / duplicate-line manipulation | Server-owned price calculation, custom price parity, quantity/total limits |
| Anonymous checkout abuse | Authenticated anonymous identities, atomic reservation limits; provider abuse controls required |
| Unrestricted image uploads and filenames | Raster MIME + magic-byte checks, size limit, admin access, generated paths |
| Customer PII and fake paid records in localStorage | Removed persistence and browser-to-admin order mirroring; server authoritative |
| Packing-slip HTML injection | Escape every text field and detach popup opener |
| Spreadsheet formula injection | CSV cells escaped and formulas neutralized |
| Nested interactive controls / hidden mobile favorite button | Buttons are siblings and favorites remain visible |
| Vulnerable development dependencies | Tooling and transitive patches updated; final audit result below |

## Verification

- Frontend and server TypeScript checks.
- Nine adversarial pure-function tests plus real-handler tests with isolated DB and
  payment-provider stubs. These cover tampered prices, invalid carts and contacts,
  HMAC failures, ownership, authorization, origins, captured status, request limits,
  rate-limit rejection and webhook database retry behavior.
- Twenty-nine UI DOM interaction tests; details in UIUX_NOTES.md.
- Production build with payments disabled by default.
- Dependency audit including development dependencies.
- Source scan confirms network calls stay in `src/api/` and server handlers.

Final command results are in `VALIDATION.json`. No live database migration, live
Razorpay request, or rendered browser QA was performed. Backend setup and a real
provider staging test remain necessary; credentials were not supplied. Existing
imported project instructions referenced Astra UI setup files that are absent from
both the archive and the installed `@figma/astraui` package; the existing setup was
retained and typechecked rather than inventing package instructions.

## Remaining operational limits

Anonymous accounts can be recreated: enable Supabase abuse protection and provider
rate limiting. Monitor failed `creating` reservations and reconcile provider events.
No automated refund flow is added. Sensitive information remains transient in
memory for receipts and admin views; an XSS elsewhere on an origin can still read
memory, so HTTPS, hosting security headers and controlled third-party scripts matter.
This bundle does not include a full penetration test or an active production audit.

## Accounts and customer photos

Customer passwords and auth tokens are not saved in browser storage. Admin permissions still use verified app metadata, never signup metadata. Recovery/confirmation fragments are removed before provider verification. Public reads expose approved reviews; pending reviews are visible to their owner and administrators. Customers cannot insert approval or timestamps, update reviews into approval, or overwrite approved photos. Private storage paths are bound to the authenticated owner; signed URLs for approved photos are public-display links and expire after one hour.

Photo previews validate raster MIME, file size and matching magic bytes in the browser. Storage independently enforces allowed MIME, size and ownership; its MIME checks are not a server image decoder. Review content is rendered as React text. The new SQL migration and real auth/storage role boundaries require backend staging verification; no live credentials were supplied. Per-account review limits do not prevent recreated identities or all orphan upload abuse. Configure provider CAPTCHA/rate limits and monitor storage usage.

Order proof must match its reserved provider order before server verification. The client accepts only an actual boolean true from verification. Razorpay test orders are flagged using the server's key, excluded from normal order views and blocked from fulfillment transitions. Order sharing does not mark orders paid or clear the cart. No messages were sent during tests.

## Release hardening

Customer account routes and admin routes are separate. Admin route guards verify identity and the server-assigned app_metadata role. Every management API repeats that check, with database RLS and Edge Function authorization enforcing access. The read-only preview uses synthetic records and never enables mutations. Draft posters use an admin-only catalog row with atomic publication and revision conflicts. No browser passcode, default admin credentials, user-metadata role grants or localStorage authorization flags exist.

The production build rejects privileged Supabase keys and VITE_* secret variables. The preferred browser setting is VITE_SUPABASE_PUBLISHABLE_KEY; legacy anon keys remain supported. This is configuration validation, not token authentication. Browser secrets still must never be supplied to the frontend.

Cached and remote catalog fields, prices, shop handles, categories, content and offer settings are validated before rendering. Invalid records cannot crash rendering or create unbounded quantities. Authoritative empty catalogs are accepted. Custom uploads now share bounded MIME/header checks with customer photos, and asynchronous preview work ignores stale selections. Custom requests have Indian-phone validation and explicit estimated totals; they never claim payment or message delivery.

Four additional readiness tests cover malformed records, public-key classification, accidental secret configuration, raster MIME spoofing and image quality. The final suite totals 57 tests. Live backend policies, real merchant payments and rendered browser geometry remain outside this verified scope.

Admin content publishing uses a separate revision-checked RPC and whitelisted public settings shape. Shop API keys, passwords and payment secrets are excluded. Public providers normalize the published configuration before rendering React text. CSV fields are quoted and formula-prefixed values are neutralized. Tag/catalog edits do not erase order history; posted payment IDs and paid flags remain excluded from admin updates. Live database/RLS tests are still required for the new settings migration.
