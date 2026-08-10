-- 0041_membership_application_communication_preferences.sql
--
-- T-085/D-13: "a `communication_preferences jsonb` column ... added _now_
-- so consent is captured from the first form." 0003 added the column;
-- this closes the loop by letting the one form that creates a person
-- pre-membership (api.submit_membership_application, 0010) actually
-- capture it. `create or replace` keeps the same function identity —
-- Postgres allows appending new DEFAULT-valued parameters this way
-- without dropping/re-granting.
create or replace function api.submit_membership_application(
  p_full_name text,
  p_email text,
  p_phone text,
  p_tier_key text,
  p_motivation text,
  p_communication_preferences jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = identity, membership, pg_temp
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
    insert into identity.people (full_name, email, phone, source, communication_preferences)
    values (
      p_full_name, p_email, p_phone, 'application',
      coalesce(p_communication_preferences, '{"dispatch": false, "programs": false}'::jsonb)
    )
    returning id into v_person_id;
  elsif p_communication_preferences is not null then
    -- An existing person (e.g. re-applying, or already known from a
    -- reservation) gets their stated preference honored too, but only if
    -- they actually stated one this time -- an application submitted with
    -- both boxes left at their default should not silently downgrade
    -- consent someone already gave elsewhere.
    update identity.people
    set communication_preferences = p_communication_preferences
    where id = v_person_id;
  end if;

  insert into membership.applications (person_id, tier_key, motivation)
  values (v_person_id, p_tier_key, p_motivation)
  returning id into v_app_id;

  return v_app_id;
end;
$$;

comment on function api.submit_membership_application(text, text, text, text, text, jsonb) is
  'Public intake. security definer so a visitor with no account can '
  'submit -- creates or reuses an identity.people row by email. '
  'p_communication_preferences (0041) is the applicant''s stated {dispatch, '
  'programs} consent from the form; left null it just takes the column''s '
  'own default rather than overwriting anything.';
