-- 0011_membership_search_path_fix.sql
--
-- api.submit_membership_application casts `p_email::citext`, but its
-- pinned search_path (identity, membership, pg_temp) omits `public`, where
-- citext actually lives (migration 0001's bare `create extension` — same
-- root cause already documented and fixed once for identity's own
-- functions in migration 0003). First live exercise of this function
-- caught it.

create or replace function api.submit_membership_application(
  p_full_name text,
  p_email text,
  p_phone text,
  p_tier_key text,
  p_motivation text
)
returns uuid
language plpgsql
security definer
set search_path = identity, membership, public, pg_temp
as $$
declare
  v_person_id uuid;
  v_app_id uuid;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required';
  end if;
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required';
  end if;

  select id into v_person_id
  from identity.people
  where email = p_email::citext and merged_into is null
  limit 1;

  if v_person_id is null then
    insert into identity.people (full_name, email, phone, source)
    values (p_full_name, p_email, p_phone, 'application')
    returning id into v_person_id;
  end if;

  insert into membership.applications (person_id, tier_key, motivation)
  values (v_person_id, p_tier_key, p_motivation)
  returning id into v_app_id;

  return v_app_id;
end;
$$;

revoke all on function api.submit_membership_application from public;
grant execute on function api.submit_membership_application to anon, authenticated;
