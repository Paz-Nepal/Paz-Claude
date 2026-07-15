-- 0007_authz_jwt_claims.sql
--
-- Custom Access Token Auth Hook: adds `roles` and `permissions` arrays to
-- every issued JWT so the frontend's usePermission()/nav-gating (Frontend
-- Implementation Review §5.4/§8.4) can read authorization state directly
-- from the session's access token instead of an extra round trip per page
-- load. This is a UX convenience only -- it is never the security boundary:
-- every RLS policy still calls authz.has_permission()/has_staff_permission()
-- against live data, and a claim already baked into an issued JWT cannot be
-- revoked before it expires (`jwt_expiry`, currently 3600s) short of a
-- global session invalidation. Permission changes therefore take effect
-- immediately for the database and up to one token lifetime later for the
-- UI's own gating -- an accepted, documented tradeoff for a nav/UX concern,
-- not a data-access one.

create function authz.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = authz, identity, pg_temp
as $$
declare
  v_person_id uuid;
  v_roles text[];
  v_permissions text[];
  v_claims jsonb;
begin
  select identity.canonical_person(p.id) into v_person_id
  from identity.people p
  where p.auth_user_id = (event ->> 'user_id')::uuid;

  if v_person_id is null then
    return event;
  end if;

  select coalesce(array_agg(distinct ur.role_key), '{}')
  into v_roles
  from authz.user_roles ur
  where ur.person_id = v_person_id
    and (ur.expires_at is null or ur.expires_at > now());

  select coalesce(array_agg(distinct rp.permission_key), '{}')
  into v_permissions
  from authz.user_roles ur
  join authz.role_permissions rp on rp.role_key = ur.role_key
  where ur.person_id = v_person_id
    and (ur.expires_at is null or ur.expires_at > now());

  v_claims := coalesce(event -> 'claims', '{}'::jsonb)
    || jsonb_build_object('roles', to_jsonb(v_roles))
    || jsonb_build_object('permissions', to_jsonb(v_permissions));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;
comment on function authz.custom_access_token_hook(jsonb) is
  'Supabase Auth "Custom Access Token" hook, wired in supabase/config.toml '
  '[auth.hook.custom_access_token]. Adds the signed-in person''s current '
  'roles and permission keys to the JWT. RLS never trusts these claims -- '
  'only authz.has_permission()/has_staff_permission() do, against live '
  'data -- this exists solely so the frontend can gate nav/UI without a '
  'query per page load.';

-- Supabase Auth invokes hooks as `supabase_auth_admin`, never as
-- `authenticated` -- grant execute narrowly to the role that actually calls
-- this, and make sure ordinary clients can never call it directly (a client
-- forging its own claims would gain nothing since RLS ignores them, but
-- there is no reason to expose the function either).
revoke all on function authz.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function authz.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- The hook needs read access to the tables it queries. security definer
-- functions run with the owning role's privileges, but explicit grants keep
-- this auditable rather than relying on ownership alone (Build Readiness
-- Review §3.1).
grant usage on schema authz to supabase_auth_admin;
grant select on authz.user_roles, authz.role_permissions to supabase_auth_admin;
grant usage on schema identity to supabase_auth_admin;
grant select on identity.people to supabase_auth_admin;
