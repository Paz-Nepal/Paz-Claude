-- identity/03_erase_person.sql
begin;
select plan(5);

insert into identity.people (id, full_name, email, phone, bio, source) values
  ('b0000000-0000-0000-0000-000000000001', 'Erasable Person', 'erasable@example.test', '+977-000-0000', 'A short bio.', 'staff'),
  ('b0000000-0000-0000-0000-000000000099', 'Staff Actor', 'actor2@example.test', null, null, 'staff');

select identity.erase_person(
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000099'
);

select is(
  (select full_name from identity.people where id = 'b0000000-0000-0000-0000-000000000001'),
  'Erased Person',
  'Name is replaced with the tombstone placeholder'
);

select is(
  (select email from identity.people where id = 'b0000000-0000-0000-0000-000000000001'),
  null,
  'Email is scrubbed'
);

select isnt(
  (select erased_at from identity.people where id = 'b0000000-0000-0000-0000-000000000001'),
  null,
  'erased_at is stamped'
);

select is(
  (select count(*)::int from identity.people where id = 'b0000000-0000-0000-0000-000000000001'),
  1,
  'Row still exists -- erasure never hard-deletes (member number / authorship survive elsewhere)'
);

select is(
  (select count(*)::int from admin.audit_log where action = 'identity.person.erase' and entity_id = 'b0000000-0000-0000-0000-000000000001'),
  1,
  'Erasure writes exactly one audit row, preserving the pre-erasure snapshot for compliance recovery'
);

select * from finish();
rollback;
