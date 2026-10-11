# Final storefront review — 6 October 2026

The logo palette remains yellow, purple and pink. Every product image is borderless, with no artwork tint/filter. Catalog and detail images display edge to edge; selection indicators and keyboard focus outlines remain visible. The hero still changes only the wall colour through presets or a custom colour picker. Room photos and review photographs retain their original appearance.

## Customer navigation and account states

Customer login remains in the header, mobile drawer and account page. A separate Admin login link in the footer opens /admin. Protected admin pages require verified admin app metadata; /admin/preview/dashboard is read-only sample content. Unconfigured admin sign-in is disabled with an explicit explanation. Dashboard, poster editor, orders and photo-review moderation use the logo palette and responsive layouts.

Search and wishlist links open product pages. Drafts are excluded. Unknown routes recover; missing print IDs show a recovery link. Shared modals support focus trapping, Escape, counted scroll locks and focus restoration. Checkout yields its focus trap to Razorpay while retaining the scroll lock.

## Orders and images

Selected quantities, unit prices and line subtotals agree across cart and chat receipts. References are random, shipping/final chat totals require seller confirmation, and chat sharing leaves the cart available for edits. WhatsApp uses +91 75986 47185; Instagram opens the current shop handle and supplies a pasteable message with clipboard fallback. Messages are prepared, never automatically sent.

Custom orders support both chat channels, validate Indian phone numbers, include 300 GSM paper, selected finish, quantity, estimated subtotal and a reference, and tell the customer to attach the original artwork. Uploads have bounded raster MIME/header validation, decode errors and stale-selection protection. Quality warnings use the weaker pixel dimension. Starting another order revokes the object URL and resets the file input.

Invalid saved catalog, category, shop, content, offer and contact settings recover without a rendering crash. Invalid prices and image schemes are discarded; an empty published catalog stays empty. Downloaded image extensions match their MIME types.

## Reviews and footer play

Sample testimonials and room photos are labeled. The review strip scrolls linearly and pauses independently for hover, keyboard focus, touch, manual pause, hidden tabs and reduced motion. Leaving hover cannot resume a focused strip; touch cancellation clears its pause. Duplicates are hidden from assistive technology.

Photo reviews have an accessible lightbox, local preview, validation, display consent, customer sign-in and private pending submissions. Forms are locked during submission; shop moderation uses trusted provider/server tooling. Real submission availability is stated.

Original Poster Pairs footer game restored: eight tiles, four matching pairs, move counter and restart, using the storefront brand palette.

## Verification and limits

40 DOM interaction tests and 17 security/server/readiness/admin-auth/control tests pass, plus frontend/server TypeScript, a production build and an audit reporting zero dependency advisories. The secret-key build rejection was also exercised directly.

Rendered desktop/mobile browser QA is unavailable in this environment. No live Supabase migrations, email flow, review-storage permissions, Razorpay transaction or webhook delivery was exercised. The public Site has no live connection variables configured. RELEASE_REPORT.md records the exact launch blockers; these code checks do not certify a complete live production environment.

Customer photo links refresh every 45 minutes while visible and when returning to a tab. Refresh failures preserve the current gallery with an honest status; late results after unmount are ignored. Open photo reviews follow the refreshed record and close if it is removed. Product galleries reset their image/zoom state when navigating to another print, including a print with fewer images.

The shop studio now has ten sections. Full poster controls include tags, gallery images, badge/orientation, sizes and per-size prices. Bulk actions and global tag changes save the catalog transactionally with revision checks. Content/settings forms show unpublished changes, explicit publish/discard/reload controls, preserve failed edits, and publish public configuration for fresh storefront visits. Previews disable writes and downloads while allowing the read-only poster editor to open and close. CSV exports neutralize spreadsheet formulas.
