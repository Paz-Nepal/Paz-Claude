-- membership/04_application_communication_preferences.sql
--
-- T-085/D-13: api.submit_membership_application (0041) is the "first
-- form" that's supposed to capture communication_preferences consent.
begin;
select plan(4);

-- ---------------------------------------------------------------------
-- New applicant, no preferences given -- gets the column's own default,
-- not silently opted in to anything.
-- ---------------------------------------------------------------------
set local role anon;
select api.submit_membership_application(
  'Dana Newapplicant', 'dana-newapplicant@example.test', null, 'friend', 'Testing defaults', null
);
reset role;

select is(
  (select communication_preferences from identity.people where email = 'dana-newapplicant@example.test'),
  '{"dispatch": false, "programs": false}'::jsonb,
  'submit_membership_application (no prefs given): new person gets the column default'
);

-- ---------------------------------------------------------------------
-- New applicant, explicit preferences -- captured verbatim.
-- ---------------------------------------------------------------------
set local role anon;
select api.submit_membership_application(
  'Eve Optedin', 'eve-optedin@example.test', null, 'friend', 'Testing explicit consent',
  '{"dispatch": true, "programs": true}'::jsonb
);
reset role;

select is(
  (select communication_preferences from identity.people where email = 'eve-optedin@example.test'),
  '{"dispatch": true, "programs": true}'::jsonb,
  'submit_membership_application (explicit prefs): new person gets exactly what they stated'
);

-- ---------------------------------------------------------------------
-- Existing person (already has a row, e.g. from an earlier reservation)
-- re-applies. Explicit prefs update; omitted prefs leave the existing
-- value alone rather than reverting it to the default.
-- ---------------------------------------------------------------------
insert into identity.people (full_name, email, source, communication_preferences)
values ('Frank Existing', 'frank-existing@example.test', 'reservation', '{"dispatch": true, "programs": false}'::jsonb);

set local role anon;
select api.submit_membership_application(
  'Frank Existing', 'frank-existing@example.test', null, 'friend', 'Already known, no prefs stated', null
);
reset role;

select is(
  (select communication_preferences from identity.people where email = 'frank-existing@example.test'),
  '{"dispatch": true, "programs": false}'::jsonb,
  'submit_membership_application (existing person, no prefs given): prior consent is left untouched'
);

set local role anon;
select api.submit_membership_application(
  'Frank Existing', 'frank-existing@example.test', null, 'friend', 'Now opting out',
  '{"dispatch": false, "programs": false}'::jsonb
);
reset role;

select is(
  (select communication_preferences from identity.people where email = 'frank-existing@example.test'),
  '{"dispatch": false, "programs": false}'::jsonb,
  'submit_membership_application (existing person, explicit prefs): updates in place'
);

select * from finish();
rollback;
