# Wall Stories release report — 6 October 2026

The shop studio adds separate admin login and ten management sections: overview, posters, tags, categories, site content, orders, customers, reviews, offers and settings. A read-only preview is available while the backend remains unconfigured. The original Poster Pairs game and borderless storefront are preserved.

| Area | Completed work and evidence |
| --- | --- |
| Brand and product display | Borderless, edge-to-edge poster display, gallery state resets between products, original artwork colours; 300 GSM and supplied WhatsApp number preserved |
| Customer accounts | Separate customer and role-protected admin routes; read-only admin preview; signup/login/reset/recovery show accurate availability; no browser token persistence |
| Cart and order handoff | Accurate quantities, line totals, references, payment status and editing; correct WhatsApp and current Instagram destinations; clipboard fallback |
| Custom printing | Name/Indian-phone validation, both chat channels, explicit estimates, original-file attachment instructions, MIME/header checks, corrected DPI and clean preview reset |
| Reviews | Independent motion pause states, reduced motion, focus-safe lightbox, consent and private pending submissions; samples labeled; expiring photo links renew before expiry and on tab return |
| Footer arcade | Original Poster Pairs: eight symbol tiles, four matching pairs, move counter, replay and keyboard controls |
| Data resilience | Catalog/settings/content/offer validation, invalid-cache recovery, safe prices/URLs and authoritative empty catalogs |
| Payment boundaries | Server prices and authorization, captured-payment confirmation, proof matching, exact CORS, bounded payloads, webhook retry and test/live separation |
| Build configuration | Publishable/legacy anon keys supported; VITE_* secrets and privileged Supabase keys fail the build before bundling |

## Completed release checks

- 40 DOM interaction tests: public routes, modal navigation/focus, persisted-data recovery, account states, uploads, both order channels, matching pairs, keyboard, mismatch recovery and restart, reviews, SDK errors, checkout focus, expiring photo links and gallery navigation.
- 17 security/server/readiness/admin-auth/control tests: price/contact tampering, HMAC/capture, origins, identity/ownership, privileged updates, request limits, webhook retries, data validation, MIME spoofing, DPI and build-key guards.
- Frontend and server TypeScript; production Vite build; clean patch whitespace.
- Fresh dependency audit, including development dependencies: zero reported advisories.
- A non-live privileged-key fixture was rejected by an actual build invocation.

These are code and DOM checks. They do not claim that every possible bug or vulnerability has been eliminated.

## Requirements before enabling live services

1. Configure the merchant-owned Supabase project: apply the included migrations, publish the catalog/settings, configure email/password Auth and recovery URLs, private review storage and abuse protection. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then build again. Enable the admin panel using ADMIN_SETUP.md, including the admin catalog migration and trusted app-metadata role assignment.
2. Deploy the included Edge Functions and merchant Razorpay secrets; set exact ALLOWED_ORIGINS, automatic capture and the webhook. Complete the actual test-mode transaction, cancellation, capture and webhook checks in PAYMENTS.md before switching to live keys and VITE_PAYMENT_MODE=razorpay. Customer UI never contains payment secrets.
3. Run rendered desktop/mobile and assistive-technology QA against the configured Site, including product image loading, payment-provider focus, actual hosting headers, email links and storage/RLS isolation. Visual browser QA was unavailable in this environment.

No real customer messages, live charges or provider-account changes were made during verification. Tests use isolated fixtures; chat links require the customer to send the prepared request.

Admin checks include customer role denial, cache flag denial, navigation through read-only preview, failed poster saves retaining edits, private drafts excluded from storefront cache, legal fulfilment actions and review approval failure/recovery. The new database function has not been executed against a live database.

Extended checks exercise tags, galleries, per-size prices, orientation/badges, global tag apply/rename/removal, bulk save failure/draft/deletion, content publication failure and storefront updates, category/offer/contact publication, read-only controls and editor preview, settings normalization and CSV formula handling. Catalog and settings SQL functions have not been executed on a live database. Offers remain manual chat requests; Razorpay pricing and payment authority are unchanged.
