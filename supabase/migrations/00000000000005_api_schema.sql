-- 0005_api_schema.sql
--
-- The api schema is the only thing PostgREST can see (supabase/config.toml
-- [api] schemas = ["public", "api"]). Views here select from domain tables
-- with RLS still fully in force -- a view does not bypass RLS, it only
-- shapes what a permitted row looks like once RLS has already allowed it
-- (Architecture Blueprint §5.1; ADR-32 for the versioning rule).

grant usage on schema api to anon, authenticated;

-- ---------------------------------------------------------------------
-- api.my_profile -- the signed-in person's own profile
-- ---------------------------------------------------------------------
create view api.my_profile
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.display_name,
  p.email,
  p.phone,
  p.locale,
  p.avatar_path,
  p.bio,
  p.communication_preferences
from identity.people p
where p.auth_user_id = auth.uid();

comment on view api.my_profile is
  'The signed-in person''s own profile. security_invoker = true means this '
  'view runs with the *calling* user''s privileges, so identity.people''s '
  'own RLS policies (people_select_own) are what actually authorize each '
  'row -- the view does not need its own permission logic duplicated. '
  'Version this as api.my_profile_v2 if the shape ever needs a breaking '
  'change (ADR-32); additive nullable columns may be added in place.';

grant select on api.my_profile to authenticated;

-- ---------------------------------------------------------------------
-- api.update_my_profile -- the one sanctioned write path for a member's
-- own profile, so the writable column set is explicit and reviewed here
-- rather than left to whatever columns a client happens to PATCH.
-- ---------------------------------------------------------------------
create function api.update_my_profile(
  p_display_name text default null,
  p_phone text default null,
  p_bio text default null,
  p_communication_preferences jsonb default null
)
returns api.my_profile
language plpgsql
security invoker
set search_path = identity, api, pg_temp
as $$
declare
  v_person_id uuid;
  v_result api.my_profile;
begin
  update identity.people
  set
    display_name = coalesce(p_display_name, display_name),
    phone = coalesce(p_phone, phone),
    bio = coalesce(p_bio, bio),
    communication_preferences = coalesce(p_communication_preferences, communication_preferences)
  where auth_user_id = auth.uid()
  returning id into strict v_person_id;

  select * into v_result from api.my_profile where id = v_person_id;
  return v_result;
end;
$$;
comment on function api.update_my_profile is
  'security invoker (not definer): relies on identity.people''s own '
  '`people_update_own` RLS policy to authorize the update, and will raise '
  '`no_data_found` if the caller has no matching row -- it grants no '
  'privilege beyond what the caller already has.';

grant execute on function api.update_my_profile to authenticated;
