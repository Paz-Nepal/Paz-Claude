-- publishing/04_pigeon_submissions_rls.sql
--
-- Allow + deny for publishing.pigeon_submissions (0033), the private
-- "send a pigeon" inbox -- never public, reviewed by hand (spec §2/§3).
begin;
select plan(5);

insert into auth.users (id, email) values
  ('e8000000-0000-0000-0000-000000000001', 'erica-editor4@example.test'),
  ('e8000000-0000-0000-0000-000000000002', 'owen-author4@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'e8000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'e8000000-0000-0000-0000-000000000002';

insert into publishing.pigeon_submissions (contributor_name, content)
values ('Test Contributor', 'A submission for testing.');

-- ---------------------------------------------------------------------
-- pigeon_submissions_select_staff
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from publishing.pigeon_submissions),
  0,
  'pigeon_submissions_select_staff (deny): anon cannot read the inbox at all (no anon grant)'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e8000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from publishing.pigeon_submissions),
  0,
  'pigeon_submissions_select_staff (deny): an author (item.create only, no item.read) cannot read the inbox'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e8000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  exists (select 1 from publishing.pigeon_submissions where contributor_name = 'Test Contributor'),
  'pigeon_submissions_select_staff (allow): editor with publishing.item.read can read the inbox'
);

-- ---------------------------------------------------------------------
-- pigeon_submissions_update_staff
-- ---------------------------------------------------------------------
update publishing.pigeon_submissions
set reviewed = true, reviewed_by = (select authz.current_person_id()), reviewed_at = now()
where contributor_name = 'Test Contributor';
select ok(
  (select reviewed from publishing.pigeon_submissions where contributor_name = 'Test Contributor'),
  'pigeon_submissions_update_staff (allow): editor with publishing.item.update can mark a submission reviewed'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e8000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update publishing.pigeon_submissions set reviewed = false;
reset role;
select ok(
  (select reviewed from publishing.pigeon_submissions where contributor_name = 'Test Contributor'),
  'pigeon_submissions_update_staff (deny): an author (no item.update) cannot un-review a submission'
);

select * from finish();
rollback;
