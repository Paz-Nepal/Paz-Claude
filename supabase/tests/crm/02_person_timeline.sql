-- crm/02_person_timeline.sql
--
-- T-095/D-14: api.person_timeline (0044) unions seven event categories,
-- each visible only through the underlying table's own staff RLS policy
-- -- no permission check is duplicated in the function itself, so this
-- test is really checking that the union composes each table's existing
-- policy correctly, not re-testing each policy from scratch.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('a8000000-0000-0000-0000-000000000001', 'quinn-subject8@example.test'),
  ('a8000000-0000-0000-0000-000000000002', 'ray-fullaccess8@example.test'),
  ('a8000000-0000-0000-0000-000000000003', 'sam-membershiponly8@example.test'),
  ('a8000000-0000-0000-0000-000000000004', 'tara-nobody8@example.test');

-- Ray: full read access across every domain the timeline unions.
insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000002';
insert into authz.user_roles (person_id, role_key)
select id, 'finance' from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000002';
insert into authz.user_roles (person_id, role_key)
select id, 'program_manager' from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000002';
insert into authz.user_roles (person_id, role_key)
select id, 'hospitality_manager' from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000002';

-- Sam: membership_manager only (membership.application.read,
-- membership.member.read, crm.relationship.read -- not pledges,
-- registrations, or reservations).
insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000003';

-- ---------------------------------------------------------------------
-- Fixtures: one of each event category, all belonging to Quinn.
-- ---------------------------------------------------------------------
insert into crm.relationships (person_id, kind, started_on, ended_on)
select id, 'donor', current_date - 30, current_date - 1
from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000001';

insert into crm.interactions (relationship_id, summary)
select r.id, 'Called to discuss renewal'
from crm.relationships r
join identity.people p on p.id = r.person_id
where p.auth_user_id = 'a8000000-0000-0000-0000-000000000001';

insert into crm.pledges (relationship_id, pledged_amount_cents)
select r.id, 500000
from crm.relationships r
join identity.people p on p.id = r.person_id
where p.auth_user_id = 'a8000000-0000-0000-0000-000000000001';

insert into membership.applications (person_id, tier_key, motivation)
select id, 'friend', 'Test timeline application'
from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000001';

insert into membership.members (person_id, member_no, tier_key, status)
select id, 'PAZ-TEST-QUINN', 'friend', 'active'
from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000001';

insert into membership.terms (member_id, tier_key, starts_on, ends_on, amount_cents)
select id, 'friend', current_date, (current_date + interval '1 year')::date, 200000
from membership.members where member_no = 'PAZ-TEST-QUINN';

insert into programs.venues (name) values ('Test Timeline Venue');
insert into programs.programs (slug, title) values ('test-timeline-program', 'Test Timeline Program');
insert into programs.sessions (program_id, venue_id, starts_at, ends_at, capacity)
select p.id, v.id, now() + interval '1 day', now() + interval '1 day 2 hours', 10
from programs.programs p, programs.venues v
where p.slug = 'test-timeline-program' and v.name = 'Test Timeline Venue';

insert into programs.registrations (session_id, person_id)
select s.id, per.id
from programs.sessions s
join programs.programs pr on pr.id = s.program_id
cross join identity.people per
where pr.slug = 'test-timeline-program' and per.auth_user_id = 'a8000000-0000-0000-0000-000000000001';

insert into hospitality.reservations (code, person_id, guest_name, party_size, starts_at)
select 'TEST-TIMELINE-01', id, 'Quinn Subject', 2, now() + interval '1 day'
from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- Ray (full access): all seven categories present.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a8000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';

create temporary table test_ray_timeline as
select * from api.person_timeline(
  (select id from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000001')
);
reset role;

select ok(
  exists (select 1 from test_ray_timeline where kind = 'interaction'),
  'person_timeline (full access): sees the interaction'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'relationship_started'),
  'person_timeline (full access): sees the relationship start'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'relationship_ended'),
  'person_timeline (full access): sees the relationship end'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'pledge'),
  'person_timeline (full access): sees the pledge'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'membership_application'),
  'person_timeline (full access): sees the membership application'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'membership_term'),
  'person_timeline (full access): sees the membership term'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'program_registration'),
  'person_timeline (full access): sees the programme registration'
);
select ok(
  exists (select 1 from test_ray_timeline where kind = 'reservation'),
  'person_timeline (full access): sees the reservation'
);

-- ---------------------------------------------------------------------
-- Sam (membership_manager only): membership + crm.relationship
-- categories, but not pledges, registrations, or reservations.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a8000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';

select is(
  (
    select count(*)::int from api.person_timeline(
      (select id from identity.people where auth_user_id = 'a8000000-0000-0000-0000-000000000001')
    )
    where kind in ('pledge', 'program_registration', 'reservation')
  ),
  0,
  'person_timeline (partial access): membership_manager sees none of pledges/registrations/reservations'
);
reset role;

select * from finish();
rollback;
