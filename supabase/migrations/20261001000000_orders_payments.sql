-- Orders table used by the payment functions.
-- Only the server (service role) reads/writes paid orders. Do NOT add a public
-- SELECT policy: orders contain customers' names, phones and addresses.

create table if not exists ws_orders (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table ws_orders add column if not exists razorpay_order_id text;

create unique index if not exists ws_orders_razorpay_order_id_key
  on ws_orders (razorpay_order_id) where razorpay_order_id is not null;

alter table ws_orders enable row level security;
