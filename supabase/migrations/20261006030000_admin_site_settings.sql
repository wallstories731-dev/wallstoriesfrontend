-- Safe public content/configuration; secrets never belong in this row.
begin;
create or replace function public.ws_save_site_settings(p_data jsonb,p_expected_revision bigint)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_revision bigint;next_revision bigint;safe_data jsonb;
begin
 if (auth.jwt()->'app_metadata'->>'role') is distinct from 'admin' then raise exception 'Administrator access required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>150000 then raise exception 'Invalid settings'; end if;
 if jsonb_typeof(p_data->'shop') is distinct from 'object' or jsonb_typeof(p_data->'content') is distinct from 'object' or jsonb_typeof(p_data->'categories') is distinct from 'array' then raise exception 'Invalid content';end if;
 perform pg_advisory_xact_lock(918529);
 select coalesce((data->>'revision')::bigint,0) into current_revision from public.ws_posters where id='shop_settings' for update;
 current_revision=coalesce(current_revision,0);
 if p_expected_revision is distinct from current_revision then raise exception 'Settings changed. Reload and retry.' using errcode='40001';end if;
 next_revision=current_revision+1;
 safe_data=jsonb_build_object('revision',next_revision,'shop',p_data->'shop','categories',p_data->'categories','featuredConfig',p_data->'featuredConfig','content',p_data->'content','contact',p_data->'contact','offers',p_data->'offers');
 insert into public.ws_posters(id,data) values('shop_settings',safe_data) on conflict(id) do update set data=excluded.data;
 return next_revision;
end $$;
revoke all on function public.ws_save_site_settings(jsonb,bigint) from public,anon;
grant execute on function public.ws_save_site_settings(jsonb,bigint) to authenticated;
commit;
