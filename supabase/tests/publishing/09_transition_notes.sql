-- publishing/09_transition_notes.sql
--
-- T-059: optional notes on a transition (0048) -- most useful on a
-- send-back, but not restricted to one.
begin;
select plan(3);

insert into auth.users (id, email) values
  ('e2000000-0000-0000-0000-000000000001', 'aki-editor2@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'e2000000-0000-0000-0000-000000000001';

insert into publishing.items (type, status, slug, title, author)
select 'article', v.status::publishing.item_status, v.slug, v.title, id
from identity.people, (values
  ('in_review', 't59-with-note', 'Case: send-back with a note'),
  ('in_review', 't59-no-note', 'Case: send-back with no note')
) as v(status, slug, title)
where auth_user_id = 'e2000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "e2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';

select publishing.transition_item(
  (select id from publishing.items where slug = 't59-with-note'),
  'draft', null, 'Needs a stronger lede -- see paragraph 2'
);
select publishing.transition_item(
  (select id from publishing.items where slug = 't59-no-note'),
  'draft'
);
reset role;

select is(
  (
    select notes from publishing.item_revisions
    where item_id = (select id from publishing.items where slug = 't59-with-note')
      and kind = 'transition'
  ),
  'Needs a stronger lede -- see paragraph 2',
  'transition_item (with notes): the note is stored on the transition revision'
);

select is(
  (
    select notes from publishing.item_revisions
    where item_id = (select id from publishing.items where slug = 't59-no-note')
      and kind = 'transition'
  ),
  null,
  'transition_item (no notes): the revision''s notes stay null, not an empty string'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "e2000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select is(
  (
    select notes from api.item_revisions(
      (select id from publishing.items where slug = 't59-with-note')
    )
    where kind = 'transition'
  ),
  'Needs a stronger lede -- see paragraph 2',
  'api.item_revisions: the note is visible through the list function too'
);
reset role;

select * from finish();
rollback;
