-- Run AFTER the original orders migration. Apply to your own Supabase project.
begin;
create table if not exists public.ws_posters (id text primary key, data jsonb not null default '{}'::jsonb);
alter table public.ws_posters enable row level security;
alter table public.ws_orders enable row level security;
alter table public.ws_orders add column if not exists user_id uuid references auth.users(id);
alter table public.ws_orders add column if not exists amount_paise bigint;
alter table public.ws_orders add column if not exists currency text not null default 'INR';
alter table public.ws_orders add column if not exists payment_id text;
create unique index if not exists ws_orders_payment_id_key on public.ws_orders(payment_id) where payment_id is not null;
create index if not exists ws_orders_checkout_user on public.ws_orders(user_id,created_at);
-- Replace potentially permissive existing policies on these dedicated app tables.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('ws_posters','ws_orders') loop
 execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end $$;
create policy catalog_public_read on public.ws_posters for select to anon,authenticated using (id in ('catalog','shop_settings'));
create policy catalog_admin_write on public.ws_posters for all to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin') with check ((auth.jwt()->'app_metadata'->>'role')='admin');
create policy orders_admin_read on public.ws_orders for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');
-- Deliberately NO browser policies for writes or customer order reads.
revoke all on public.ws_orders from anon,authenticated;
grant select on public.ws_orders to authenticated;
grant all on public.ws_orders,public.ws_posters to service_role;
grant select on public.ws_posters to anon;
grant select,insert,update,delete on public.ws_posters to authenticated;

-- Atomic reservation throttles even concurrent attempts. Only server service role may call.
create or replace function public.ws_reserve_order(p_ref text,p_user_id uuid,p_amount bigint,p_data jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(918527); -- serializes rate count and insert
 if p_amount<100 or p_amount>50000000 or p_user_id is null then return false; end if;
 if exists(select 1 from ws_orders where id=p_ref) then return false; end if;
 if (select count(*) from ws_orders where user_id=p_user_id and created_at>now()-interval '10 minutes')>=5 then return false; end if;
 if (select count(*) from ws_orders where created_at>now()-interval '1 minute')>=100 then return false; end if;
 insert into ws_orders(id,user_id,amount_paise,currency,status,data) values(p_ref,p_user_id,p_amount,'INR','creating',p_data);
 return true;
end $$;
revoke all on function public.ws_reserve_order(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.ws_reserve_order(text,uuid,bigint,jsonb) to service_role;

create or replace function public.ws_mark_paid(p_order_id text,p_payment_id text,p_amount bigint,p_currency text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r ws_orders%rowtype;
begin
 select * into r from ws_orders where razorpay_order_id=p_order_id for update;
 if not found or r.amount_paise is distinct from p_amount or r.currency is distinct from p_currency then return false; end if;
 if r.payment_id is not null then return r.payment_id=p_payment_id; end if;
 if r.status not in ('awaiting_payment','cancelled') then return false; end if;
 update ws_orders set status='paid',payment_id=p_payment_id,data=data || jsonb_build_object('paymentId',p_payment_id,'paidAt',now()) where id=r.id;
 return true;
end $$;
revoke all on function public.ws_mark_paid(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.ws_mark_paid(text,text,bigint,text) to service_role;

-- Storage: raster images only, size bounded at the server; UUID/user folders are set by the API module.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('poster-images','poster-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- On a fresh dedicated project these are the only app object write policies.
create policy poster_images_admin_insert on storage.objects for insert to authenticated with check
(bucket_id='poster-images' and (auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text);
create policy poster_images_admin_update on storage.objects for update to authenticated using
(bucket_id='poster-images' and (auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text) with check
(bucket_id='poster-images' and (auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text);
create policy poster_images_admin_delete on storage.objects for delete to authenticated using
(bucket_id='poster-images' and (auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text);
create policy poster_images_admin_select on storage.objects for select to authenticated using
(bucket_id='poster-images' and (auth.jwt()->'app_metadata'->>'role')='admin');
-- RESTRICTIVE guards also block any pre-existing permissive object-write policies
-- for this bucket without altering access to unrelated buckets.
create policy poster_images_write_guard_insert on storage.objects as restrictive for insert to public with check
(bucket_id!='poster-images' or ((auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text));
create policy poster_images_write_guard_update on storage.objects as restrictive for update to public using
(bucket_id!='poster-images' or ((auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text)) with check
(bucket_id!='poster-images' or ((auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text));
create policy poster_images_write_guard_delete on storage.objects as restrictive for delete to public using
(bucket_id!='poster-images' or ((auth.jwt()->'app_metadata'->>'role')='admin' and (storage.foldername(name))[1]=auth.uid()::text));

commit;
