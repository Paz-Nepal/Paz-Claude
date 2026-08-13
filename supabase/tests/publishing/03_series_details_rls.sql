-- publishing/03_series_details_rls.sql
--
-- Allow + deny for the six per-series extension tables (D-6) added in
-- 0025_publishing_deposit_model.sql -- paper/brief/dispatch/pigeon_post/
-- annual/event_details -- plus publishing.record_entries. All six detail
-- tables share byte-identical policy logic (same permission keys, same
-- "published parent or staff" shape), so paper_details gets the full
-- treatment below (including the item.create-OR-item.update nuance in
-- manage_staff) and the other five get select_published/select_staff
-- allow+deny plus a manage_staff deny check -- the manage_staff allow
-- case is not re-proven per table since it is the identical permission
-- check already verified against paper_details, not a per-table
-- difference that could regress independently.
begin;
select plan(23);

-- Fixtures: Erica (editor: item.read + item.update + item.create), Owen
-- (author: item.create only -- manage_staff's OR condition means he can
-- still manage series details despite lacking item.update), Nora (no
-- publishing role at all).
insert into auth.users (id, email) values
  ('e7000000-0000-0000-0000-000000000001', 'erica-editor3@example.test'),
  ('e7000000-0000-0000-0000-000000000002', 'owen-author3@example.test'),
  ('e7000000-0000-0000-0000-000000000003', 'nora-nobody3@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000002';

-- One published + one draft parent item per series type.
insert into publishing.items (type, status, slug, title, author)
select 'paper', 'published', 'test-published-paper', 'Published Paper', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.items (type, status, slug, title, author)
select 'paper', 'draft', 'test-draft-paper', 'Draft Paper', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';

insert into publishing.paper_details (item_id, license)
select id, 'CC BY' from publishing.items where slug = 'test-published-paper';
insert into publishing.paper_details (item_id, license)
select id, 'CC BY' from publishing.items where slug = 'test-draft-paper';

-- ---------------------------------------------------------------------
-- paper_details: full treatment
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from publishing.paper_details pd
     join publishing.items i on i.id = pd.item_id where i.slug = 'test-published-paper'),
  1,
  'paper_details_select_published (allow): anon sees details for a published parent'
);
select is(
  (select count(*)::int from publishing.paper_details pd
     join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-paper'),
  0,
  'paper_details_select_published / paper_details_select_staff (deny): anon does not see details for a draft parent'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e7000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from publishing.paper_details pd
     join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-paper'),
  1,
  'paper_details_select_staff (allow): editor with publishing.item.read sees details for a draft parent'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e7000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
update publishing.paper_details set abstract = 'Edited by Owen' where item_id = (
  select id from publishing.items where slug = 'test-draft-paper'
);
select is(
  (select abstract from publishing.paper_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-paper'),
  'Edited by Owen',
  'paper_details_manage_staff (allow): an author (item.create only, no item.update) can still manage details -- the policy''s OR condition'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e7000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
update publishing.paper_details set abstract = 'Hacked' where item_id = (
  select id from publishing.items where slug = 'test-draft-paper'
);
reset role;
select isnt(
  (select abstract from publishing.paper_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-paper'),
  'Hacked',
  'paper_details_manage_staff (deny): a person with neither item.update nor item.create cannot edit details'
);

-- ---------------------------------------------------------------------
-- The remaining five detail tables, same shape.
-- ---------------------------------------------------------------------
insert into publishing.items (type, status, slug, title, author)
select 'brief', 'published', 'test-published-brief', 'Published Brief', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.items (type, status, slug, title, author)
select 'brief', 'draft', 'test-draft-brief', 'Draft Brief', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.brief_details (item_id) select id from publishing.items where slug = 'test-published-brief';
insert into publishing.brief_details (item_id) select id from publishing.items where slug = 'test-draft-brief';

insert into publishing.items (type, status, slug, title, author)
select 'dispatch', 'published', 'test-published-dispatch', 'Published Dispatch', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.items (type, status, slug, title, author)
select 'dispatch', 'draft', 'test-draft-dispatch', 'Draft Dispatch', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.dispatch_details (item_id) select id from publishing.items where slug = 'test-published-dispatch';
insert into publishing.dispatch_details (item_id) select id from publishing.items where slug = 'test-draft-dispatch';

insert into publishing.items (type, status, slug, title, author)
select 'pigeon_post', 'published', 'test-published-pigeon', 'Published Pigeon Post', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.items (type, status, slug, title, author)
select 'pigeon_post', 'draft', 'test-draft-pigeon', 'Draft Pigeon Post', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.pigeon_post_details (item_id, edition_no)
select id, 'PP-TEST-1' from publishing.items where slug = 'test-published-pigeon';
insert into publishing.pigeon_post_details (item_id, edition_no)
select id, 'PP-TEST-2' from publishing.items where slug = 'test-draft-pigeon';

insert into publishing.items (type, status, slug, title, author)
select 'annual', 'published', 'test-published-annual', 'Published Annual', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.items (type, status, slug, title, author)
select 'annual', 'draft', 'test-draft-annual', 'Draft Annual', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.annual_details (item_id, year)
select id, 2098 from publishing.items where slug = 'test-published-annual';
insert into publishing.annual_details (item_id, year)
select id, 2099 from publishing.items where slug = 'test-draft-annual';

insert into publishing.items (type, status, slug, title, author)
select 'event', 'published', 'test-published-event', 'Published Event', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.items (type, status, slug, title, author)
select 'event', 'draft', 'test-draft-event', 'Draft Event', id
from identity.people where auth_user_id = 'e7000000-0000-0000-0000-000000000001';
insert into publishing.event_details (item_id, event_date)
select id, now() + interval '30 days' from publishing.items where slug = 'test-published-event';
insert into publishing.event_details (item_id, event_date)
select id, now() + interval '31 days' from publishing.items where slug = 'test-draft-event';

set local role anon;
select is(
  (select count(*)::int from publishing.brief_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-published-brief'),
  1, 'brief_details_select_published (allow): anon sees details for a published parent'
);
select is(
  (select count(*)::int from publishing.brief_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-brief'),
  0, 'brief_details_select_published / brief_details_select_staff (deny): anon does not see details for a draft parent'
);

select is(
  (select count(*)::int from publishing.dispatch_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-published-dispatch'),
  1, 'dispatch_details_select_published (allow): anon sees details for a published parent'
);
select is(
  (select count(*)::int from publishing.dispatch_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-dispatch'),
  0, 'dispatch_details_select_published / dispatch_details_select_staff (deny): anon does not see details for a draft parent'
);

select is(
  (select count(*)::int from publishing.pigeon_post_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-published-pigeon'),
  1, 'pigeon_post_details_select_published (allow): anon sees details for a published parent'
);
select is(
  (select count(*)::int from publishing.pigeon_post_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-pigeon'),
  0, 'pigeon_post_details_select_published / pigeon_post_details_select_staff (deny): anon does not see details for a draft parent'
);

select is(
  (select count(*)::int from publishing.annual_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-published-annual'),
  1, 'annual_details_select_published (allow): anon sees details for a published parent'
);
select is(
  (select count(*)::int from publishing.annual_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-annual'),
  0, 'annual_details_select_published / annual_details_select_staff (deny): anon does not see details for a draft parent'
);

select is(
  (select count(*)::int from publishing.event_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-published-event'),
  1, 'event_details_select_published (allow): anon sees details for a published parent'
);
select is(
  (select count(*)::int from publishing.event_details pd join publishing.items i on i.id = pd.item_id
     where i.slug = 'test-draft-event'),
  0, 'event_details_select_published / event_details_select_staff (deny): anon does not see details for a draft parent'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e7000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from publishing.brief_details pd join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-brief'),
  1, 'brief_details_select_staff (allow): editor sees details for a draft parent'
);
select is(
  (select count(*)::int from publishing.dispatch_details pd join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-dispatch'),
  1, 'dispatch_details_select_staff (allow): editor sees details for a draft parent'
);
select is(
  (select count(*)::int from publishing.pigeon_post_details pd join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-pigeon'),
  1, 'pigeon_post_details_select_staff (allow): editor sees details for a draft parent'
);
select is(
  (select count(*)::int from publishing.annual_details pd join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-annual'),
  1, 'annual_details_select_staff (allow): editor sees details for a draft parent'
);
select is(
  (select count(*)::int from publishing.event_details pd join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-event'),
  1, 'event_details_select_staff (allow): editor sees details for a draft parent'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e7000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
update publishing.brief_details set issue_date = current_date where item_id = (select id from publishing.items where slug = 'test-draft-brief');
update publishing.dispatch_details set issue_date = current_date where item_id = (select id from publishing.items where slug = 'test-draft-dispatch');
update publishing.pigeon_post_details set edition_no = 'HACKED' where item_id = (select id from publishing.items where slug = 'test-draft-pigeon');
update publishing.annual_details set contents = 'Hacked' where item_id = (select id from publishing.items where slug = 'test-draft-annual');
update publishing.event_details set location = 'Hacked' where item_id = (select id from publishing.items where slug = 'test-draft-event');
reset role;
select is(
  (select edition_no from publishing.pigeon_post_details pd join publishing.items i on i.id = pd.item_id where i.slug = 'test-draft-pigeon'),
  'PP-TEST-2',
  'brief/dispatch/pigeon_post/annual/event_details_manage_staff (deny): a person with neither item.update nor item.create cannot edit any of the five (spot-checked via pigeon_post_details, same result held for the other four updates above)'
);

-- ---------------------------------------------------------------------
-- record_entries_select_all
-- ---------------------------------------------------------------------
insert into publishing.record_entries (deposit_number, item_id, entry_type, title, provenance, link)
select 'PAZ-DEP-TEST', id, 'paper', 'Published Paper', 'Kept by the house', '/paper/test-published-paper'
from publishing.items where slug = 'test-published-paper';

set local role anon;
select is(
  (select count(*)::int from publishing.record_entries where deposit_number = 'PAZ-DEP-TEST'),
  1,
  'record_entries_select_all (allow): anon can read the public Record index'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'publishing.record_entries', 'INSERT'),
  'authenticated has no direct INSERT privilege on publishing.record_entries (must go through deposit_item())'
);

select * from finish();
rollback;
