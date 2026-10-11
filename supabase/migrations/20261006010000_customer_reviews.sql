begin;
create table if not exists public.ws_reviews(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(trim(display_name)) between 1 and 100),
 city text not null default '' check(char_length(city)<=100),
 rating smallint not null check(rating between 1 and 5),
 body text not null check(char_length(trim(body)) between 10 and 1200),
 photo_path text not null check(photo_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'),
 approved boolean not null default false,
 created_at timestamptz not null default now(),
 check(split_part(photo_path,'/',1)=user_id::text)
);
alter table public.ws_reviews enable row level security;
revoke all on public.ws_reviews from anon,authenticated;
grant select on public.ws_reviews to anon,authenticated;
grant insert(user_id,display_name,city,rating,body,photo_path),update(approved),delete on public.ws_reviews to authenticated;
grant all on public.ws_reviews to service_role;
create policy reviews_read on public.ws_reviews for select to anon,authenticated using(approved or user_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy reviews_submit on public.ws_reviews for insert to authenticated with check(user_id=auth.uid() and not approved and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy reviews_admin_approve on public.ws_reviews for update to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin') with check(auth.jwt()->'app_metadata'->>'role'='admin');
create policy reviews_delete on public.ws_reviews for delete to authenticated using((user_id=auth.uid() and not approved) or auth.jwt()->'app_metadata'->>'role'='admin');
create index if not exists ws_reviews_owner_date on public.ws_reviews(user_id,created_at);
create or replace function public.ws_review_submission_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.user_id::text));
 if (select count(*) from ws_reviews where user_id=new.user_id and created_at>now()-interval '1 day')>=3 then raise exception 'Review submission limit reached'; end if;
 if not exists(select 1 from storage.objects where bucket_id='review-photos' and name=new.photo_path) then raise exception 'Review photo not found'; end if;
 return new;
end $$;
revoke all on function public.ws_review_submission_guard() from public,anon,authenticated;
create trigger ws_review_guard before insert on public.ws_reviews for each row execute function public.ws_review_submission_guard();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('review-photos','review-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy review_photos_insert on storage.objects for insert to authenticated with check(bucket_id='review-photos' and (storage.foldername(name))[1]=auth.uid()::text and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy review_photos_read on storage.objects for select to anon,authenticated using(bucket_id='review-photos' and ((storage.foldername(name))[1]=auth.uid()::text or auth.jwt()->'app_metadata'->>'role'='admin' or exists(select 1 from public.ws_reviews where approved and photo_path=name)));
create policy review_photos_delete on storage.objects for delete to authenticated using(bucket_id='review-photos' and (auth.jwt()->'app_metadata'->>'role'='admin' or ((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.ws_reviews where approved and photo_path=name))));
-- Restrictive guards keep this bucket closed even if older object policies are permissive.
create policy review_photos_insert_guard on storage.objects as restrictive for insert to public with check(bucket_id!='review-photos' or ((storage.foldername(name))[1]=auth.uid()::text and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false));
create policy review_photos_update_guard on storage.objects as restrictive for update to public using(bucket_id!='review-photos') with check(bucket_id!='review-photos');
create policy review_photos_read_guard on storage.objects as restrictive for select to public using(bucket_id!='review-photos' or ((storage.foldername(name))[1]=auth.uid()::text or auth.jwt()->'app_metadata'->>'role'='admin' or exists(select 1 from public.ws_reviews where approved and photo_path=name)));
create policy review_photos_delete_guard on storage.objects as restrictive for delete to public using(bucket_id!='review-photos' or auth.jwt()->'app_metadata'->>'role'='admin' or ((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.ws_reviews where approved and photo_path=name)));
commit;
