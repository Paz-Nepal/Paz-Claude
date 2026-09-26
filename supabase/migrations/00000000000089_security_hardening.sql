-- 0089_security_hardening.sql
--
-- Three findings from the codebase audit.
--
-- 1. identity.people: RLS let a signed-in person update their own row, and the
--    table granted UPDATE on every column, so a person could rewrite their own
--    email, merged_into, erased_at, deceased_at, source or auth_user_id. Only
--    the columns a person legitimately edits about themselves stay writable
--    directly. Everything else changes through the definer functions that
--    already exist (merge_people, erase_person, the Friends application).
-- 2. api.register_for_session was callable by anon, so anyone could skip the
--    Edge Function's rate limit, create people rows and register any email into
--    a session. The signed-in path stays; the guest path becomes a
--    service-role-only function reached only through the Edge Function, which
--    rate limits it like every other public intake (ADR 036).
-- 3. authz.roles, permissions and role_permissions had no RLS. Signed-in people
--    may still read the catalogue (the desk shows role names), but now by an
--    explicit policy, and anon by nothing.

-- ---------------------------------------------------------------------
-- 1. Narrow what a person can write about themselves
-- ---------------------------------------------------------------------
revoke update on identity.people from authenticated;
grant update (display_name, phone, bio, communication_preferences, avatar_path, locale)
  on identity.people to authenticated;

-- A stray anonymous grant on the profile writer is never useful.
revoke execute on function api.update_my_profile(text, text, text, jsonb) from anon;

-- ---------------------------------------------------------------------
-- 2. Guest registration: service role only
-- ---------------------------------------------------------------------
create function api.register_guest_for_session(
  p_session uuid, p_full_name text, p_email text, p_phone text
)
returns programs.registration_status
language plpgsql
volatile
security definer
set search_path = programs, identity, authz, public, pg_temp
as $$
declare
  v_person_id uuid;
  v_reg programs.registrations;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required' using errcode = '22023';
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;

  select id into v_person_id
  from identity.people
  where email = btrim(p_email)::citext and merged_into is null
  limit 1;

  if v_person_id is null then
    insert into identity.people (full_name, email, phone, source)
    values (btrim(p_full_name), btrim(p_email), nullif(btrim(p_phone), ''), 'application')
    returning id into v_person_id;
  end if;

  v_reg := programs.register(p_session, v_person_id);
  return v_reg.status;
end;
$$;
revoke all on function api.register_guest_for_session(uuid, text, text, text) from public, anon, authenticated;
grant execute on function api.register_guest_for_session(uuid, text, text, text) to service_role;

-- The signed-in path only: someone who is known registers as themselves.
create or replace function api.register_for_session(
  p_session uuid, p_full_name text, p_email text, p_phone text
)
returns programs.registration_status
language plpgsql
volatile
security definer
set search_path = programs, identity, authz, public, pg_temp
as $$
declare
  v_person_id uuid := authz.current_person_id();
  v_reg programs.registrations;
begin
  if v_person_id is null then
    raise exception 'Sign in to register, or register as a guest through the site.'
      using errcode = '42501';
  end if;
  v_reg := programs.register(p_session, v_person_id);
  return v_reg.status;
end;
$$;
revoke execute on function api.register_for_session(uuid, text, text, text) from anon;

-- ---------------------------------------------------------------------
-- 3. The permission catalogue: readable when signed in, by policy
-- ---------------------------------------------------------------------
alter table authz.roles enable row level security;
alter table authz.permissions enable row level security;
alter table authz.role_permissions enable row level security;

create policy roles_select_signed_in on authz.roles
  for select to authenticated using (true);
create policy permissions_select_signed_in on authz.permissions
  for select to authenticated using (true);
create policy role_permissions_select_signed_in on authz.role_permissions
  for select to authenticated using (true);
