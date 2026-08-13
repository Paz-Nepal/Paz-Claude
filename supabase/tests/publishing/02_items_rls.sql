-- publishing/02_items_rls.sql
--
-- Allow + deny for publishing.items (final shape after 0025's
-- items_select_staff redefinition), publishing.item_revisions,
-- publishing.tags, and publishing.item_tags.
begin;
select plan(19);

-- Fixtures: Erica (editor: full item permissions), Owen and Pat (author:
-- item.create only -- can create/edit their own drafts, nothing else),
-- Nora (no publishing role at all).
insert into auth.users (id, email) values
  ('e6000000-0000-0000-0000-000000000001', 'erica-editor2@example.test'),
  ('e6000000-0000-0000-0000-000000000002', 'owen-author2@example.test'),
  ('e6000000-0000-0000-0000-000000000003', 'pat-author@example.test'),
  ('e6000000-0000-0000-0000-000000000004', 'nora-nobody2@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000002';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000003';

insert into publishing.items (type, status, slug, title, author)
select 'article', 'published', 'test-published-article', 'Published Article', id
from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000001';

insert into publishing.items (type, status, slug, title, author)
select 'article', 'draft', 'test-owen-draft', 'Owen''s Draft', id
from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000002';

insert into publishing.items (type, status, slug, title, author)
select 'article', 'draft', 'test-pat-draft', 'Pat''s Draft', id
from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000003';

insert into publishing.items (type, status, slug, title, author, deleted_at)
select 'article', 'draft', 'test-owen-deleted-draft', 'Owen''s Discarded Draft', id, now()
from identity.people where auth_user_id = 'e6000000-0000-0000-0000-000000000002';

insert into publishing.tags (slug, name) values ('test-tag', 'Test Tag');
insert into publishing.item_tags (item_id, tag_id)
select i.id, t.id from publishing.items i, publishing.tags t
where i.slug = 'test-published-article' and t.slug = 'test-tag';

-- ---------------------------------------------------------------------
-- items_select_published
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from publishing.items where slug = 'test-published-article'),
  1,
  'items_select_published (allow): anon sees a published item'
);
select is(
  (select count(*)::int from publishing.items where status = 'draft'),
  0,
  'items_select_published / items_select_own / items_select_staff (deny): anon sees no drafts'
);
reset role;

-- ---------------------------------------------------------------------
-- items_select_own
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from publishing.items where slug = 'test-owen-draft'),
  1,
  'items_select_own (allow): Owen sees his own draft'
);
select is(
  (select count(*)::int from publishing.items where slug = 'test-pat-draft'),
  0,
  'items_select_own (deny): Owen does not see Pat''s draft'
);
reset role;

-- ---------------------------------------------------------------------
-- items_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from publishing.items where slug in ('test-owen-draft', 'test-pat-draft')),
  2,
  'items_select_staff (allow): editor with publishing.item.read sees every non-deleted draft'
);
select is(
  (select count(*)::int from publishing.items where slug = 'test-owen-deleted-draft'),
  0,
  'items_select_staff (deny): editor does not see a soft-deleted draft, even with item.read'
);
reset role;

-- ---------------------------------------------------------------------
-- items_insert_author
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
insert into publishing.items (type, status, slug, title, author)
select 'article', 'draft', 'test-owen-new-draft', 'New Draft', (select authz.current_person_id());
select ok(
  exists (select 1 from publishing.items where slug = 'test-owen-new-draft'),
  'items_insert_author (allow): an author can create a draft as themselves'
);
select throws_ok(
  $$insert into publishing.items (type, status, slug, title, author)
    select 'article', 'in_review', 'test-owen-bad-status', 'Bad Status', (select authz.current_person_id())$$,
  '42501',
  'items_insert_author (deny): an author cannot create an item with any status but draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000004", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$insert into publishing.items (type, status, slug, title, author)
    select 'article', 'draft', 'test-nora-draft', 'Nora Cannot', (select authz.current_person_id())$$,
  '42501',
  'items_insert_author (deny): a person without publishing.item.create cannot create an item at all'
);
reset role;

-- ---------------------------------------------------------------------
-- items_update_own_draft / items_update_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update publishing.items set title = 'Owen Edited This' where slug = 'test-owen-draft';
select is(
  (select title from publishing.items where slug = 'test-owen-draft'),
  'Owen Edited This',
  'items_update_own_draft (allow): Owen can edit his own draft'
);
update publishing.items set title = 'Owen Should Not Edit This' where slug = 'test-pat-draft';
reset role;
select isnt(
  (select title from publishing.items where slug = 'test-pat-draft'),
  'Owen Should Not Edit This',
  'items_update_own_draft (deny): Owen cannot edit Pat''s draft'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
update publishing.items set title = 'Editor Edited This' where slug = 'test-published-article';
select is(
  (select title from publishing.items where slug = 'test-published-article'),
  'Editor Edited This',
  'items_update_staff (allow): editor with publishing.item.update can edit any item'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update publishing.items set title = 'Owen Should Not Edit This Either' where slug = 'test-published-article';
reset role;
select isnt(
  (select title from publishing.items where slug = 'test-published-article'),
  'Owen Should Not Edit This Either',
  'items_update_staff (deny): an author cannot edit a published item they don''t own (items_update_own_draft requires draft status; no policy grants this)'
);

-- ---------------------------------------------------------------------
-- item_revisions_select_own / item_revisions_select_staff
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select ok(
  exists (
    select 1 from publishing.item_revisions r
    join publishing.items i on i.id = r.item_id
    where i.slug = 'test-owen-draft'
  ),
  'item_revisions_select_own (allow): Owen sees revisions of his own draft (auto-captured on insert/update)'
);
select is(
  (select count(*)::int from publishing.item_revisions r
     join publishing.items i on i.id = r.item_id
     where i.slug = 'test-pat-draft'),
  0,
  'item_revisions_select_own (deny): Owen does not see revisions of Pat''s draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select ok(
  (select count(*)::int from publishing.item_revisions) > 0,
  'item_revisions_select_staff (allow): editor with publishing.item.read sees every revision'
);
reset role;

-- ---------------------------------------------------------------------
-- tags_select_all / item_tags_select_all
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from publishing.tags where slug = 'test-tag'),
  1,
  'tags_select_all (allow): anon can read tags'
);
select is(
  (select count(*)::int from publishing.item_tags),
  1,
  'item_tags_select_all (allow): anon can read item_tags'
);
reset role;

-- ---------------------------------------------------------------------
-- Table-level grant sanity
-- ---------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'publishing.items', 'DELETE'),
  'authenticated has no DELETE privilege on publishing.items at all (aggregates are archived, never row-deleted)'
);

select * from finish();
rollback;
