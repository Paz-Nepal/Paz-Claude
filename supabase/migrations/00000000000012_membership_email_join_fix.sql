-- 0012_membership_email_join_fix.sql
--
-- api.membership_applications and api.members both `join identity.people p
-- on p.id = ...` to read p.email — but as security_invoker views, that join
-- requires the CALLER to have SELECT on identity.people, which resolves
-- through identity.people's own RLS (people_select_own / people_select_staff,
-- the latter gated by identity.person.read). membership_manager has none of
-- the membership.* permissions coupled to identity.person.read, so the join
-- silently dropped every row for anyone without it — caught live: a
-- membership_manager test account saw zero applications despite one
-- genuinely being pending.
--
-- Same fix as identity.display_name() (migration 0008): a narrow,
-- security-definer accessor that exposes exactly one column, so reading it
-- doesn't require broader identity.people access.

create function identity.email_for(p_person uuid)
returns citext
language sql
stable
security definer
set search_path = identity, pg_temp
as $$
  select email
  from identity.people
  where id = identity.canonical_person(p_person);
$$;
comment on function identity.email_for(uuid) is
  'Returns only the email for a person id, same rationale as '
  'identity.display_name(uuid) — lets a security_invoker view show a '
  'contact address without requiring the caller to hold '
  'identity.person.read.';

revoke all on function identity.email_for(uuid) from public;
grant execute on function identity.email_for(uuid) to authenticated;

create or replace view api.membership_applications
with (security_invoker = true)
as
select
  a.id, a.status, a.tier_key, a.motivation, a.submitted_at,
  a.decided_at, a.decision_notes,
  identity.display_name(a.person_id) as applicant_name,
  identity.email_for(a.person_id) as applicant_email
from membership.applications a;

create or replace view api.members
with (security_invoker = true)
as
select
  m.id, m.member_no, m.tier_key, m.status, m.directory_opt_in, m.joined_on,
  identity.display_name(m.person_id) as member_name,
  identity.email_for(m.person_id) as member_email
from membership.members m;
