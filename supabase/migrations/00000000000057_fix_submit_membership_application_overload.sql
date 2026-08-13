-- 0057_fix_submit_membership_application_overload.sql
--
-- Two real bugs found live-testing the rate-limit work in 0051-0056,
-- both first exercises of api.submit_membership_application against a
-- real database:
--
-- 1. 0043's `create or replace function api.submit_membership_application`
--    added a sixth parameter (p_communication_preferences) on the same
--    reasoning already proven wrong for publishing.transition_item in
--    0048/0049: appending a parameter changes the argument-type list, so
--    Postgres created a second overload instead of replacing the
--    original 5-arg function from 0010/0011 in place. Both were live
--    simultaneously -- confirmed by PostgREST itself refusing to pick
--    one ("Could not choose the best candidate function") the moment
--    both were called with an overlapping 5-argument shape. The 5-arg
--    original was never touched by 0051's revoke (it only named the
--    6-arg signature), so it was still directly anon/authenticated-
--    callable this whole time -- a caller using exactly 5 arguments could
--    bypass the rate limit entirely.
-- 2. 0043 also silently reintroduced a bug 0011 had already fixed once:
--    `set search_path = identity, membership, pg_temp` omits `public`,
--    where the citext extension actually lives (0001's bare
--    `create extension`), so `p_email::citext` fails with "type citext
--    does not exist". 0011's fix only applied to the 5-arg function it
--    edited in place; 0043's new 6-arg function needed the same fix
--    again and didn't get it.

drop function if exists api.submit_membership_application(text, text, text, text, text);
drop function if exists api.submit_membership_application(text, text, text, text, text, jsonb);

create function api.submit_membership_application(
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
  'p_communication_preferences (0043) is the applicant''s stated {dispatch, '
  'programs} consent from the form; left null it just takes the column''s '
  'own default rather than overwriting anything. Single function, not two '
  'overloads (0057) -- search_path includes public, where citext lives '
  '(0011''s fix, reapplied after 0043 silently dropped it by creating a '
  'new function object instead of replacing the old one in place).';

revoke all on function api.submit_membership_application(text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function api.submit_membership_application(text, text, text, text, text, jsonb)
  to service_role;
