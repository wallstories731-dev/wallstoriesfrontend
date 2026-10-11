# API boundaries

Pages/components render UI. `src/api/` owns browser requests and public connection
configuration; `supabase/functions/` owns server requests, authorization and secrets.
Separating a file does **not** hide browser credentials: all `VITE_*` values are public.

| File | Responsibility |
| --- | --- |
| config.ts / publicConfig.ts + root .env.example | Public backend URL/key, bucket, payment mode and build-time secret rejection |
| client.ts | Single Supabase browser client; sessions are memory-only |
| auth.ts | Supabase sign-in, verified admin app_metadata claim, checkout identity |
| customerAuth.ts | Customer signup/login, recovery, verified identity and memory-only sessions |
| reviews.ts | Approved photo reads, validated owner uploads, submission and verified admin moderation |
| catalog.ts / settings.ts | Public reads, authenticated catalog/settings publishing |
| payments.ts | Checkout API adapter and Razorpay browser SDK |
| storage.ts / safety.ts | Admin-only bounded raster uploads, safe IDs and validation |
| media.ts / images.ts | Image downloads, MIME/header checks and print DPI |
| models.ts | Catalog, shop and saved-state validation |
| orderRef.ts | Random references for catalog and custom orders |
| publication.ts | Public configuration bootstrap and admin-only revision-checked content/settings publication |
| adminExport.ts | CSV downloads and prepared WhatsApp reply URLs |
| admin.ts | Admin-only catalog reads, atomic revision-checked publication, and bounded image uploads |
| orders.ts | Authenticated server order reads and restricted mutations |
| content.ts | Local content/offer preferences; customer notes are transient drafts |
| localStore.ts | Non-sensitive preferences and cart; sensitive keys use memory only |
| supabase/functions/_shared/server.ts | Server provider connections and common auth/CORS/body handling |
| supabase/functions/_shared/core.ts | Pure pricing, validation and HMAC helpers |
| supabase/.env.example | Server-only payment secrets and allowed origins |

Do not import `@supabase/supabase-js`, use `fetch`, or read localStorage from UI files.
The database policies are the authorization boundary, even if someone bypasses the UI.
Uploads use a generated user/UUID path, ignoring caller-supplied filenames.

The app has separate customer and admin login. The routed shop studio repeats verified admin role checks through these API modules; server RLS/Edge Functions remain the authorization boundary. Read-only preview does not call admin APIs.
