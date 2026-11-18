# API boundaries

Pages/components render UI. `src/api/` owns browser requests and public connection
configuration; the Java backend (`/backend`) owns server requests, authorization and secrets.
Separating a file does **not** hide browser credentials: all `VITE_*` values are public.

| File | Responsibility |
| --- | --- |
| config.ts / publicConfig.ts + root .env.example | Public backend URL/key, bucket, payment mode and build-time secret rejection |
| backendClient.ts | Single REST client for the Java backend (JWT in storage, auto refresh) |
| productMapper.ts / imageStaging.ts / settingsRepo.ts | Backend product↔`Poster` mapping, staged image uploads, `/api/settings` access |
| auth.ts | Admin role check from backend JWT roles, checkout identity |
| customerAuth.ts | Customer signup/login, recovery, verified identity and memory-only sessions |
| reviews.ts | `/api/review` featured/product reviews (photo reviews and moderation not supported by the backend yet) |
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

Supabase is no longer used (`frontend/supabase/` is legacy). Do not use `fetch`, or read localStorage from UI files.
The database policies are the authorization boundary, even if someone bypasses the UI.
Uploads use a generated user/UUID path, ignoring caller-supplied filenames.

The app has separate customer and admin login. The routed shop studio repeats verified admin role checks through these API modules; server RLS/Edge Functions remain the authorization boundary. Read-only preview does not call admin APIs.
