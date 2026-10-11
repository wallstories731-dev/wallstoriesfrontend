-- Atomic publication with private drafts and optimistic revision checking.
-- Apply AFTER the existing security migration on the merchant-owned project.
begin;
create or replace function public.ws_save_admin_catalog(p_posters jsonb,p_expected_revision bigint)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_revision bigint; next_revision bigint; published jsonb;
begin
 if (auth.jwt()->'app_metadata'->>'role') is distinct from 'admin' then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if jsonb_typeof(p_posters) is distinct from 'array' then raise exception 'Catalog must be an array'; end if;
 if jsonb_array_length(p_posters)>500 then raise exception 'Catalog is too large'; end if;
 if exists(select 1 from jsonb_array_elements(p_posters) p where
  jsonb_typeof(p) is distinct from 'object' or coalesce(p->>'id','')!~'^[A-Za-z0-9_-]{1,100}$' or
  coalesce(p->>'title','')='' or coalesce(p->>'code','')='' or coalesce(p->>'category','')='' or
  coalesce(p->>'image','')!~'^(https://|/[^/])' or
  jsonb_typeof(p->'basePrice') is distinct from 'number' or
  coalesce(p->>'status','active') not in ('active','draft') or jsonb_typeof(p->'sizes') is distinct from 'array'
 ) then raise exception 'Invalid poster'; end if;
 if exists(select 1 from jsonb_array_elements(p_posters) p where
  (p->>'basePrice')::numeric<=0 or (p->>'basePrice')::numeric>500000 or jsonb_array_length(p->'sizes')=0 or
  exists(select 1 from jsonb_array_elements_text(p->'sizes') s where s not in ('A4','A3','A2','12×18','18×24'))
 ) then raise exception 'Invalid price or sizes'; end if;
 if (select count(distinct p->>'id') from jsonb_array_elements(p_posters) p)<>jsonb_array_length(p_posters) then raise exception 'Duplicate poster ID'; end if;
 if (select count(distinct upper(trim(p->>'code'))) from jsonb_array_elements(p_posters) p)<>jsonb_array_length(p_posters) then raise exception 'Duplicate catalog code'; end if;
 perform pg_advisory_xact_lock(918528);
 select (data->>'revision')::bigint into current_revision from public.ws_posters where id='admin_catalog' for update;
 current_revision=coalesce(current_revision,0);
 if p_expected_revision is distinct from current_revision then raise exception 'Catalog changed. Reload and retry.' using errcode='40001'; end if;
 next_revision=current_revision+1;
 select coalesce(jsonb_agg(p),'[]'::jsonb) into published from jsonb_array_elements(p_posters) p where coalesce(p->>'status','active')='active';
 insert into public.ws_posters(id,data) values('admin_catalog',jsonb_build_object('revision',next_revision,'posters',p_posters))
 on conflict(id) do update set data=excluded.data;
 insert into public.ws_posters(id,data) values('catalog',published) on conflict(id) do update set data=excluded.data;
 return next_revision;
end $$;
revoke all on function public.ws_save_admin_catalog(jsonb,bigint) from public,anon;
grant execute on function public.ws_save_admin_catalog(jsonb,bigint) to authenticated;
-- Existing RLS permits admin_catalog only for the signed admin role.
commit;
