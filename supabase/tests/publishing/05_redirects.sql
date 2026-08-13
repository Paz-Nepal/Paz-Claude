-- publishing/05_redirects.sql
--
-- T-049: publishing.redirects, the items_slug_redirect trigger, and
-- api.resolve_redirect (0043).
begin;
select plan(6);

insert into auth.users (id, email) values
  ('f7000000-0000-0000-0000-000000000001', 'fiona-editor6@example.test');

insert into publishing.items (type, status, slug, title, author)
select 'article', 'published', 'test-redirect-original', 'Original Title', id
from identity.people where auth_user_id = 'f7000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- A single rename records a redirect and resolves.
-- ---------------------------------------------------------------------
update publishing.items set slug = 'test-redirect-renamed'
where slug = 'test-redirect-original';

select is(
  (select count(*)::int from publishing.redirects where old_slug = 'test-redirect-original'),
  1,
  'items_slug_redirect: a slug change records exactly one redirect row'
);

select is(
  api.resolve_redirect('article', 'test-redirect-original'),
  'test-redirect-renamed',
  'resolve_redirect: the old slug resolves to the new one'
);

-- ---------------------------------------------------------------------
-- A second rename (chained A -> B -> C): the *original* slug still
-- resolves in one hop, because the lookup joins to the item's current
-- slug rather than snapshotting a destination at write time.
-- ---------------------------------------------------------------------
update publishing.items set slug = 'test-redirect-final'
where slug = 'test-redirect-renamed';

select is(
  api.resolve_redirect('article', 'test-redirect-original'),
  'test-redirect-final',
  'resolve_redirect: a chained rename (A->B->C) resolves the earliest slug directly to the final one'
);
select is(
  api.resolve_redirect('article', 'test-redirect-renamed'),
  'test-redirect-final',
  'resolve_redirect: the intermediate slug also resolves to the final one'
);

-- ---------------------------------------------------------------------
-- No redirect exists for a slug that was never used -> null, not an error.
-- ---------------------------------------------------------------------
select is(
  api.resolve_redirect('article', 'test-redirect-never-existed'),
  null,
  'resolve_redirect: an unrecognized slug returns null'
);

-- ---------------------------------------------------------------------
-- An unpublished item's redirect no longer resolves -- a visitor
-- shouldn't be sent to a draft/archived page.
-- ---------------------------------------------------------------------
update publishing.items set status = 'archived' where slug = 'test-redirect-final';

select is(
  api.resolve_redirect('article', 'test-redirect-original'),
  null,
  'resolve_redirect: a redirect to a no-longer-published item returns null'
);

select * from finish();
rollback;
