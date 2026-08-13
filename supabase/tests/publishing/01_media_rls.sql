-- publishing/01_media_rls.sql
--
-- Allow + deny for publishing.media and storage.objects (the 'media'
-- bucket) policies in 0008_publishing.sql.
begin;
select plan(9);

-- Fixtures: Erica (editor: publishing.media.create + .manage), Owen
-- (author: media.create only, no .manage), Nora (no publishing role).
insert into auth.users (id, email) values
  ('e5000000-0000-0000-0000-000000000001', 'erica-editor@example.test'),
  ('e5000000-0000-0000-0000-000000000002', 'owen-author@example.test'),
  ('e5000000-0000-0000-0000-000000000003', 'nora-nobody@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'e5000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'e5000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------
-- media_select_all
-- ---------------------------------------------------------------------
insert into publishing.media (storage_path, mime_type, alt, created_by)
select 'original/test.jpg', 'image/jpeg', 'Test image', id
from identity.people where auth_user_id = 'e5000000-0000-0000-0000-000000000001';

set local role anon;
select is(
  (select count(*)::int from publishing.media where storage_path = 'original/test.jpg'),
  1,
  'media_select_all (allow): anon can read media metadata'
);
reset role;

-- ---------------------------------------------------------------------
-- media_insert_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
insert into publishing.media (storage_path, mime_type, alt, created_by)
select 'original/owen.jpg', 'image/jpeg', 'Owen''s upload', (select authz.current_person_id());
select ok(
  exists (select 1 from publishing.media where storage_path = 'original/owen.jpg'),
  'media_insert_staff (allow): an author with publishing.media.create can register media as themselves'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$insert into publishing.media (storage_path, mime_type, alt, created_by)
    select 'original/nora.jpg', 'image/jpeg', 'Should fail', (select authz.current_person_id())$$,
  '42501',
  'media_insert_staff (deny): a person without publishing.media.create cannot register media'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$insert into publishing.media (storage_path, mime_type, alt, created_by)
    values ('original/impersonate.jpg', 'image/jpeg', 'Impersonating', 'e5000000-0000-0000-0000-000000000001')$$,
  '42501',
  'media_insert_staff (deny): created_by must equal the caller, even with publishing.media.create'
);
reset role;

-- ---------------------------------------------------------------------
-- media_update_manage
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
update publishing.media set alt = 'Updated alt text' where storage_path = 'original/test.jpg';
select is(
  (select alt from publishing.media where storage_path = 'original/test.jpg'),
  'Updated alt text',
  'media_update_manage (allow): editor with publishing.media.manage can edit media metadata'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update publishing.media set alt = 'Hacked' where storage_path = 'original/test.jpg';
reset role;
select isnt(
  (select alt from publishing.media where storage_path = 'original/test.jpg'),
  'Hacked',
  'media_update_manage (deny): an author (media.create only, no .manage) cannot edit media metadata'
);

-- ---------------------------------------------------------------------
-- storage.objects: media_objects_select_all / media_objects_insert_staff
-- ---------------------------------------------------------------------
insert into storage.objects (bucket_id, name) values ('media', 'original/existing-test.jpg');

set local role anon;
select is(
  (select count(*)::int from storage.objects where bucket_id = 'media' and name = 'original/existing-test.jpg'),
  1,
  'media_objects_select_all (allow): anon can list objects in the media bucket'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
insert into storage.objects (bucket_id, name) values ('media', 'original/owen-object.jpg');
select ok(
  exists (select 1 from storage.objects where bucket_id = 'media' and name = 'original/owen-object.jpg'),
  'media_objects_insert_staff (allow): an author with publishing.media.create can upload into the media bucket'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('media', 'original/nora-object.jpg')$$,
  '42501',
  'media_objects_insert_staff (deny): a person without publishing.media.create cannot upload into the media bucket'
);
reset role;

select * from finish();
rollback;
