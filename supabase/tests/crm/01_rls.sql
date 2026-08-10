-- crm/01_rls.sql
--
-- Allow + deny for every RLS policy in 0020_crm.sql. Every CRM table is
-- staff-only (migration 0020's own header comment: "No public surface at
-- all") so there is no self/anon allow case to test here, unlike
-- identity/membership/programs -- only staff-permission gating.
begin;
select plan(21);

-- Fixtures: Alice (membership_manager: organizations/relationships/
-- interactions), Frank (finance: pledges), Grace (no staff role at all).
insert into auth.users (id, email) values
  ('c3000000-0000-0000-0000-000000000001', 'alice-mm2@example.test'),
  ('c3000000-0000-0000-0000-000000000002', 'frank-finance@example.test'),
  ('c3000000-0000-0000-0000-000000000003', 'grace-nobody@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people
where auth_user_id = 'c3000000-0000-0000-0000-000000000001';

insert into authz.user_roles (person_id, role_key)
select id, 'finance' from identity.people
where auth_user_id = 'c3000000-0000-0000-0000-000000000002';

insert into crm.organizations (name, kind) values ('Test Foundation', 'foundation');

insert into crm.relationships (org_id, kind, owner_person)
select o.id, 'donor', p.id
from crm.organizations o, identity.people p
where o.name = 'Test Foundation' and p.auth_user_id = 'c3000000-0000-0000-0000-000000000001';

insert into crm.interactions (relationship_id, summary, created_by)
select r.id, 'Test interaction', p.id
from crm.relationships r, identity.people p
where p.auth_user_id = 'c3000000-0000-0000-0000-000000000001'
  and r.id = (select id from crm.relationships limit 1);

insert into crm.pledges (relationship_id, pledged_amount_cents)
select id, 500000 from crm.relationships limit 1;

-- ---------------------------------------------------------------------
-- organizations_select_staff / organizations_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from crm.organizations where name = 'Test Foundation') = 1,
  'organizations_select_staff (allow): membership_manager can read organizations'
);
update crm.organizations set kind = 'ngo' where name = 'Test Foundation';
select is(
  (select kind from crm.organizations where name = 'Test Foundation'),
  'ngo',
  'organizations_manage_staff (allow): membership_manager with aal2 can edit an organization'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from crm.organizations),
  0,
  'organizations_select_staff (deny): a person with no CRM permission reads none'
);
update crm.organizations set kind = 'hacked' where name = 'Test Foundation';
reset role;
select isnt(
  (select kind from crm.organizations where name = 'Test Foundation'),
  'hacked',
  'organizations_manage_staff (deny): a person with no CRM permission cannot edit an organization'
);

-- ---------------------------------------------------------------------
-- org_people_select_staff / org_people_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
insert into crm.org_people (org_id, person_id, role)
select o.id, p.id, 'contact'
from crm.organizations o, identity.people p
where o.name = 'Test Foundation' and p.auth_user_id = 'c3000000-0000-0000-0000-000000000003';
select ok(
  exists (select 1 from crm.org_people),
  'org_people_manage_staff (allow): membership_manager can link a person to an organization'
);
select ok(
  (select count(*)::int from crm.org_people) > 0,
  'org_people_select_staff (allow): membership_manager can read org_people'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from crm.org_people),
  0,
  'org_people_select_staff (deny): a person with no CRM permission reads none, even a row naming themselves'
);
reset role;

-- ---------------------------------------------------------------------
-- relationships_select_staff / relationships_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from crm.relationships) > 0,
  'relationships_select_staff (allow): membership_manager can read relationships'
);
update crm.relationships set notes = 'Edited by test' where kind = 'donor';
select is(
  (select notes from crm.relationships where kind = 'donor'),
  'Edited by test',
  'relationships_manage_staff (allow): membership_manager with aal2 can edit a relationship'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from crm.relationships),
  0,
  'relationships_select_staff (deny): a person with no CRM permission reads none'
);
update crm.relationships set notes = 'Hacked' where kind = 'donor';
reset role;
select isnt(
  (select notes from crm.relationships where kind = 'donor'),
  'Hacked',
  'relationships_manage_staff (deny): a person with no CRM permission cannot edit a relationship'
);

-- ---------------------------------------------------------------------
-- interactions_select_staff / interactions_insert_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from crm.interactions) > 0,
  'interactions_select_staff (allow): membership_manager can read interactions'
);
insert into crm.interactions (relationship_id, summary, created_by)
select id, 'Second test interaction', (select authz.current_person_id()) from crm.relationships limit 1;
select is(
  (select count(*)::int from crm.interactions where summary = 'Second test interaction'),
  1,
  'interactions_insert_staff (allow): membership_manager can log an interaction as themselves'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from crm.interactions),
  0,
  'interactions_select_staff (deny): a person with no CRM permission reads none'
);
reset role;

-- interactions_insert_staff's with-check requires created_by = the
-- caller -- membership_manager cannot log an interaction impersonating
-- someone else, even though they hold crm.interaction.create.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$insert into crm.interactions (relationship_id, summary, created_by)
    select id, 'Impersonating', 'c3000000-0000-0000-0000-000000000003' from crm.relationships limit 1$$,
  '42501',
  'interactions_insert_staff (deny): membership_manager cannot log an interaction as someone else'
);
reset role;

-- ---------------------------------------------------------------------
-- pledges_select_staff / pledges_manage_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from crm.pledges) > 0,
  'pledges_select_staff (allow): finance can read pledges'
);
update crm.pledges set notes = 'Acknowledged by test';
select is(
  (select notes from crm.pledges limit 1),
  'Acknowledged by test',
  'pledges_manage_staff (allow): finance with aal2 can edit a pledge'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c3000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from crm.pledges),
  0,
  'pledges_select_staff (deny): a person with no CRM permission reads none'
);
update crm.pledges set notes = 'Hacked';
reset role;
select isnt(
  (select notes from crm.pledges limit 1),
  'Hacked',
  'pledges_manage_staff (deny): a person with no CRM permission cannot edit a pledge'
);

-- ---------------------------------------------------------------------
-- Table-level grant sanity: interactions are append-only by grant, not
-- just by RLS -- no role, staff included, has UPDATE or DELETE.
-- ---------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'crm.interactions', 'UPDATE'),
  'authenticated has no UPDATE privilege on crm.interactions at all (append-only by design, D-14)'
);
select ok(
  not has_table_privilege('authenticated', 'crm.interactions', 'DELETE'),
  'authenticated has no DELETE privilege on crm.interactions at all (append-only by design, D-14)'
);

select * from finish();
rollback;
