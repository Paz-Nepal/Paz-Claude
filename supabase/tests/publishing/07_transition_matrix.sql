-- publishing/07_transition_matrix.sql
--
-- T-047: every legal and illegal edge of publishing.transition_item's
-- state machine (0008), permission-checked per edge. 02_items_rls.sql
-- already covers items_select_*/item_revisions RLS; this is the state
-- machine itself, which had no dedicated matrix coverage despite
-- transition_item's own comment claiming "pgTAP covers every legal and
-- illegal edge" -- that comment was aspirational, not accurate, until
-- this file.
--
-- One fresh item per case (rather than chaining transitions on one item)
-- so a deny doesn't leave a later case starting from the wrong status.
begin;
select plan(19);

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-000000000001', 'wren-editor0@example.test'),
  ('c0000000-0000-0000-0000-000000000002', 'xan-author0@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'c0000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'c0000000-0000-0000-0000-000000000002';

-- One item per slug, each seeded directly at the status the case needs
-- (direct insert, not transition_item -- block_direct_status_change only
-- fires on UPDATE).
insert into publishing.items (type, status, slug, title, author)
select 'article', 'draft', 't47-draft-by-author', 'Case: draft, author-owned', id
from identity.people where auth_user_id = 'c0000000-0000-0000-0000-000000000002';

insert into publishing.items (type, status, slug, title, author)
select 'article', 'draft', v.slug, v.title, id
from identity.people, (values
  ('t47-draft-01', 'Case: draft->in_review staff path'),
  ('t47-draft-02', 'Case: draft->in_review deny'),
  ('t47-draft-03', 'Case: draft->published allow'),
  ('t47-draft-04', 'Case: draft->published deny'),
  ('t47-draft-05', 'Case: draft->archived illegal')
) as v(slug, title)
where auth_user_id = 'c0000000-0000-0000-0000-000000000001';

insert into publishing.items (type, status, slug, title, author)
select 'article', 'in_review', v.slug, v.title, id
from identity.people, (values
  ('t47-review-01', 'Case: in_review->draft allow'),
  ('t47-review-02', 'Case: in_review->draft deny'),
  ('t47-review-03', 'Case: in_review->published allow'),
  ('t47-review-04', 'Case: in_review->published deny'),
  ('t47-review-05', 'Case: in_review->archived illegal')
) as v(slug, title)
where auth_user_id = 'c0000000-0000-0000-0000-000000000001';

insert into publishing.items (type, status, slug, title, author, published_at)
select 'article', 'published', v.slug, v.title, id, now()
from identity.people, (values
  ('t47-published-01', 'Case: published->archived allow'),
  ('t47-published-02', 'Case: published->archived deny'),
  ('t47-published-03', 'Case: published->draft illegal'),
  ('t47-published-04', 'Case: published->in_review illegal')
) as v(slug, title)
where auth_user_id = 'c0000000-0000-0000-0000-000000000001';

insert into publishing.items (type, status, slug, title, author, published_at, archived_at)
select 'article', 'archived', v.slug, v.title, id, now(), now()
from identity.people, (values
  ('t47-archived-01', 'Case: archived->published allow'),
  ('t47-archived-02', 'Case: archived->published deny'),
  ('t47-archived-03', 'Case: archived->draft illegal'),
  ('t47-archived-04', 'Case: archived->in_review illegal')
) as v(slug, title)
where auth_user_id = 'c0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- draft -> in_review: two independent legal paths (owning author with
-- item.create, or any staff with item.update), plus a deny.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-draft-by-author'), 'in_review'
  )$$,
  'draft -> in_review (allow, author path): the owning author may submit their own draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-draft-01'), 'in_review'
  )$$,
  'draft -> in_review (allow, staff path): an editor may submit any draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-draft-02'), 'in_review'
  )$$,
  'draft -> in_review (deny): an author cannot submit someone else''s draft'
);
reset role;

-- ---------------------------------------------------------------------
-- in_review -> draft (send-back)
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-review-01'), 'draft'
  )$$,
  'in_review -> draft (allow): an editor may send an item back to draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-review-02'), 'draft'
  )$$,
  'in_review -> draft (deny): an author (item.create only) cannot send an item back'
);
reset role;

-- ---------------------------------------------------------------------
-- draft -> published, in_review -> published
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-draft-03'), 'published'
  )$$,
  'draft -> published (allow): an editor may publish directly from draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-draft-04'), 'published'
  )$$,
  'draft -> published (deny): an author cannot publish'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-review-03'), 'published'
  )$$,
  'in_review -> published (allow): an editor may publish from review'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-review-04'), 'published'
  )$$,
  'in_review -> published (deny): an author cannot publish from review'
);
reset role;

-- ---------------------------------------------------------------------
-- published -> archived, archived -> published
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-published-01'), 'archived'
  )$$,
  'published -> archived (allow): an editor may archive'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-published-02'), 'archived'
  )$$,
  'published -> archived (deny): an author cannot archive'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-archived-01'), 'published'
  )$$,
  'archived -> published (allow): an editor may restore an archived item to published'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-archived-02'), 'published'
  )$$,
  'archived -> published (deny): an author cannot restore an archived item'
);
reset role;

-- ---------------------------------------------------------------------
-- Illegal edges: attempted by the editor, who holds every publishing
-- permission there is -- these fail on the transition itself, not on
-- a missing grant, proving the state machine (not just authz) rejects
-- them.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';

select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-draft-05'), 'archived'
  )$$,
  'draft -> archived (illegal): rejected even for a full-permission editor'
);
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-review-05'), 'archived'
  )$$,
  'in_review -> archived (illegal): rejected even for a full-permission editor'
);
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-published-03'), 'draft'
  )$$,
  'published -> draft (illegal): rejected even for a full-permission editor'
);
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-published-04'), 'in_review'
  )$$,
  'published -> in_review (illegal): rejected even for a full-permission editor'
);
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-archived-03'), 'draft'
  )$$,
  'archived -> draft (illegal): rejected even for a full-permission editor'
);
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't47-archived-04'), 'in_review'
  )$$,
  'archived -> in_review (illegal): rejected even for a full-permission editor'
);
reset role;

select * from finish();
rollback;
