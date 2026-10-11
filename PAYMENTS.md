# Separate payment backend

All Razorpay secret use is server-only under `supabase/functions`. The browser knows
only the public checkout key ID returned from a reserved server order.

## Configuration

Public root environment (`.env`, ignored by Git):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-key
VITE_SUPABASE_BUCKET=poster-images
VITE_PAYMENT_MODE=off
```

Set server values from `supabase/.env.example` with Supabase secrets. Do not add
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` to
browser environment variables or static files. Supabase injects its own service
role secret for edge functions. Allowed origins are comma-separated exact origins.

```sh
supabase db push
supabase secrets set --env-file supabase/.env
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
supabase functions deploy admin-orders
```

Use test-mode Razorpay credentials first. Enable anonymous Supabase Auth and abuse
protection. Configure Razorpay to automatically capture payments. Register the
`razorpay-webhook` URL in the Razorpay dashboard for `payment.captured` and
`order.paid`, using the same webhook secret as the edge function.

After deploying and testing, set `VITE_PAYMENT_MODE=razorpay` and rebuild. Unknown
modes, missing public configuration, and the default mode disable payments. Mock
payments require `pnpm dev` plus explicit `VITE_PAYMENT_MODE=mock` and are always
labeled tests; production builds disable mock mode.

## Transaction rules

1. Supabase verifies a buyer identity; the public anon key alone is insufficient.
2. The server validates bounded input, loads active published products, rejects
   duplicate lines, and calculates the price. Browser totals are cross-checks only.
3. An atomic database reservation applies per-user and global limits before a
   provider order is created. Unique references cannot overwrite an existing order.
4. The server creates a Razorpay order and stores its ID, owner, amount and currency.
   Customer PII is not put in provider order notes or logged by these handlers.
5. Verification binds the stored order to its buyer and checks the HMAC. It fetches
   the payment from Razorpay and requires captured status, matching order, amount and
   currency, and no refund before marking it paid.
6. An atomic row-locked SQL function records the payment, prevents payment-ID reuse
   and permits only repeat verification of the same payment. The signed webhook
   performs the same reconciliation and returns 503 on failure so Razorpay retries.

A closed checkout window does not prove that no money was charged. If confirmation
fails, the customer should keep the reference and check their payment app. Webhooks
reconcile successful captures even if the tab was closed.

Online totals currently exclude shipping, bundle discounts and coupons. These need
server-owned rules before they can affect charged amounts; browser offers are not
trusted. Refunds must be handled in Razorpay and reconciled separately. Orders
created by the old version without owner/amount fields need manual back-office
reconciliation; the new handlers do not guess or silently upgrade their payment state.

## Staging checks before taking real money

Verify capture and correct amount in Razorpay test mode; close the tab before
confirmation and verify webhook reconciliation; replay a webhook and confirm one
payment record; attempt other-user verification and expect denial; block database
access and expect a retriable webhook failure. Confirm database RLS blocks public
writes and order reads, and permits catalog writes only for trusted admins.

Primary provider guidance: [Razorpay integration](https://razorpay.com/docs/server-integration/python/test-app/)
and [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Storefront payment availability

The cart displays Pay Online even when checkout is off. Clicking it in that state shows an availability notice and retains the selection; no payment API is called. Once Razorpay is configured, the same button validates delivery details, creates a server-priced order, opens provider checkout and verifies the captured payment before displaying paid status. No production mock-payment option has been added.

## Frontend and test orders

The UI explicitly names Razorpay. A reserved order's amount, currency, key and provider order ID are checked before checkout. Card changes and other order actions are locked during payment; the modal focus trap yields to Razorpay. A failed SDK load cleans up for a new attempt and times out after 15 seconds. Proof is checked for the reserved order before server verification. Backend captured-payment checks remain authoritative.

When the server key starts with rzp_test_, new order data records testMode=true. Test receipts do not claim a live order; these rows are excluded from normal storefront admin order/revenue views and cannot move into printed/shipped/delivered through the admin endpoint. Inspect test records in Supabase while validating staging, and use separate staging and live environments.
