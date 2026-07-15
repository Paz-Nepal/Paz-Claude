-- identity/02_merge_people.sql
--
-- Proves the dynamic-discovery claim in identity.merge_people's comment:
-- a foreign key to identity.people(id) that the function has never heard
-- of by name is still re-pointed correctly, because discovery happens via
-- the system catalogs at call time, not a hand-maintained list.
begin;
select plan(7);

-- A synthetic table standing in for "some future domain table nobody
-- remembered to teach the merge function about." Lives in its own
-- throwaway schema so it never collides with a real domain; the whole
-- test runs inside a transaction that is rolled back at the end.
create schema if not exists crm_test;

create table crm_test.fixture_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references identity.people (id),
  note text
);

insert into identity.people (id, full_name, email, source) values
  ('a0000000-0000-0000-0000-000000000001', 'Survivor Person', 'survivor@example.test', 'staff'),
  ('a0000000-0000-0000-0000-000000000002', 'Duplicate Person', 'duplicate@example.test', 'staff'),
  ('a0000000-0000-0000-0000-000000000099', 'Staff Actor', 'actor@example.test', 'staff');

insert into crm_test.fixture_notes (person_id, note)
values ('a0000000-0000-0000-0000-000000000002', 'a note about the duplicate');

select identity.merge_people(
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000099'
);

select is(
  (select person_id from crm_test.fixture_notes where note = 'a note about the duplicate'),
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'A foreign key the merge function was never told about by name is still re-pointed to the survivor'
);

select is(
  (select merged_into from identity.people where id = 'a0000000-0000-0000-0000-000000000002'),
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Duplicate is tombstoned with merged_into set to the survivor'
);

select is(
  (select count(*)::int from identity.people where id = 'a0000000-0000-0000-0000-000000000002'),
  1,
  'Duplicate row still exists -- merge never hard-deletes'
);

select is(
  (select email from identity.people where id = 'a0000000-0000-0000-0000-000000000002'),
  null,
  'Duplicate''s email is released after merge (frees the unique constraint)'
);

select is(
  identity.canonical_person('a0000000-0000-0000-0000-000000000002'),
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'canonical_person() resolves the duplicate to the survivor'
);

select is(
  (select count(*)::int from admin.audit_log where action = 'identity.person.merge' and entity_id = 'a0000000-0000-0000-0000-000000000002'),
  1,
  'Merge writes exactly one audit row'
);

select throws_ok(
  $$select identity.merge_people('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000099')$$,
  'P0001',
  'Cannot merge a person into themselves',
  'Self-merge is rejected'
);

select * from finish();
rollback;
