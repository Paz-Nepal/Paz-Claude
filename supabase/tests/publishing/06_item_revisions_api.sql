-- publishing/06_item_revisions_api.sql
--
-- T-060: api.item_revisions / api.get_item_revision / api.restore_item_revision (0045).
begin;
select plan(7);

insert into auth.users (id, email) values
  ('b9000000-0000-0000-0000-000000000001', 'uma-editor9@example.test'),
  ('b9000000-0000-0000-0000-000000000002', 'vik-nobody9@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'b9000000-0000-0000-0000-000000000001';

insert into publishing.items (type, status, slug, title, body, body_schema_version, author)
select 'article', 'draft', 'test-revisions-item', 'Original Title',
  '{"type":"doc","content":[]}'::jsonb, 1, id
from identity.people where auth_user_id = 'b9000000-0000-0000-0000-000000000001';

-- A second content edit -> a second revision, captured automatically by
-- publishing.capture_revision (0008), not written directly here.
update publishing.items
set title = 'Edited Title', body = '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
where slug = 'test-revisions-item';

-- ---------------------------------------------------------------------
-- api.item_revisions
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "b9000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (
    select count(*)::int from api.item_revisions(
      (select id from publishing.items where slug = 'test-revisions-item')
    )
  ),
  2,
  'item_revisions (allow): editor sees both the original and edited revisions'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b9000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is(
  (
    select count(*)::int from api.item_revisions(
      (select id from publishing.items where slug = 'test-revisions-item')
    )
  ),
  0,
  'item_revisions (deny): a person with no publishing role sees none'
);
reset role;

-- ---------------------------------------------------------------------
-- api.get_item_revision
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "b9000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (
    select title from api.get_item_revision(
      (select id from publishing.item_revisions
        where item_id = (select id from publishing.items where slug = 'test-revisions-item')
        and revision_no = 1)
    )
  ),
  'Original Title',
  'get_item_revision (allow): revision 1 still has the original title'
);

-- ---------------------------------------------------------------------
-- api.restore_item_revision: restoring revision 1 (a) updates the
-- item's current title and (b) creates a *new* revision (3) via the
-- existing capture trigger -- no separate insert logic in the restore
-- function itself.
-- ---------------------------------------------------------------------
select api.restore_item_revision(
  (select id from publishing.item_revisions
    where item_id = (select id from publishing.items where slug = 'test-revisions-item')
    and revision_no = 1)
);

select is(
  (select title from publishing.items where slug = 'test-revisions-item'),
  'Original Title',
  'restore_item_revision (allow): the item''s current title reverts to the restored revision''s'
);
select is(
  (
    select count(*)::int from publishing.item_revisions
    where item_id = (select id from publishing.items where slug = 'test-revisions-item')
  ),
  3,
  'restore_item_revision (allow): restoring creates a new revision rather than rewriting history'
);
reset role;

-- ---------------------------------------------------------------------
-- A person with no access to the item can't restore it either -- the
-- read inside restore_item_revision is RLS-scoped the same as
-- item_revisions itself, so it can't find a revision to restore from.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "b9000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$select api.restore_item_revision(
    (select id from publishing.item_revisions
      where item_id = (select id from publishing.items where slug = 'test-revisions-item')
      and revision_no = 1)
  )$$,
  '42501',
  'restore_item_revision (deny): a person with no publishing role cannot restore'
);
reset role;

select is(
  (
    select count(*)::int from publishing.item_revisions
    where item_id = (select id from publishing.items where slug = 'test-revisions-item')
  ),
  3,
  'restore_item_revision (deny): the denied attempt created no revision'
);

select * from finish();
rollback;
