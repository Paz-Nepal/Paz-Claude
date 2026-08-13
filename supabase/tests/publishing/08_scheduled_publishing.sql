-- publishing/08_scheduled_publishing.sql
--
-- T-061: the three new legal edges on publishing.transition_item
-- (draft/in_review -> scheduled, scheduled -> draft, scheduled ->
-- published) and api.publish_scheduled_items, the automated job
-- (0047).
begin;
select plan(13);

insert into auth.users (id, email) values
  ('d1000000-0000-0000-0000-000000000001', 'yara-editor1@example.test'),
  ('d1000000-0000-0000-0000-000000000002', 'zeb-author1@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'd1000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'author' from identity.people where auth_user_id = 'd1000000-0000-0000-0000-000000000002';

insert into publishing.items (type, status, slug, title, author)
select 'article', v.status::publishing.item_status, v.slug, v.title, id
from identity.people, (values
  ('draft', 't61-draft-01', 'Case: draft->scheduled allow'),
  ('draft', 't61-draft-02', 'Case: draft->scheduled deny (author)'),
  ('draft', 't61-draft-03', 'Case: draft->scheduled deny (past time)'),
  ('in_review', 't61-review-01', 'Case: in_review->scheduled allow')
) as v(status, slug, title)
where auth_user_id = 'd1000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- draft/in_review -> scheduled
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't61-draft-01'), 'scheduled', now() + interval '1 day'
  )$$,
  'draft -> scheduled (allow): an editor may schedule a future publish'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't61-draft-02'), 'scheduled', now() + interval '1 day'
  )$$,
  'draft -> scheduled (deny): an author cannot schedule (needs item.publish)'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't61-draft-03'), 'scheduled', now() - interval '1 hour'
  )$$,
  'draft -> scheduled (deny): scheduled_for in the past is rejected even for an editor'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't61-review-01'), 'scheduled', now() + interval '1 day'
  )$$,
  'in_review -> scheduled (allow): an editor may schedule from review too'
);
reset role;

-- ---------------------------------------------------------------------
-- scheduled -> draft (cancel) clears scheduled_for
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't61-draft-01'), 'draft'
  )$$,
  'scheduled -> draft (allow): an editor may cancel a scheduled publish'
);
reset role;

select is(
  (select scheduled_for from publishing.items where slug = 't61-draft-01'),
  null,
  'scheduled -> draft: scheduled_for is cleared on cancel'
);

-- ---------------------------------------------------------------------
-- scheduled -> published (manual "publish now") also clears scheduled_for
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select publishing.transition_item(
    (select id from publishing.items where slug = 't61-review-01'), 'published'
  )$$,
  'scheduled -> published (allow): an editor may publish a scheduled item immediately'
);
reset role;

select is(
  (select scheduled_for from publishing.items where slug = 't61-review-01'),
  null,
  'scheduled -> published: scheduled_for is cleared on manual publish'
);

-- ---------------------------------------------------------------------
-- api.publish_scheduled_items: service_role only.
-- ---------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'api.publish_scheduled_items()', 'EXECUTE'),
  'authenticated cannot execute api.publish_scheduled_items'
);
select ok(
  not has_function_privilege('anon', 'api.publish_scheduled_items()', 'EXECUTE'),
  'anon cannot execute api.publish_scheduled_items'
);
select ok(
  has_function_privilege('service_role', 'api.publish_scheduled_items()', 'EXECUTE'),
  'service_role can execute api.publish_scheduled_items'
);

-- ---------------------------------------------------------------------
-- Behavior: two items past their scheduled_for get published; one
-- still in the future is left alone.
-- ---------------------------------------------------------------------
insert into publishing.items (type, status, slug, title, author, scheduled_for)
select 'article', 'scheduled', v.slug, v.title, id, v.scheduled_for::timestamptz
from identity.people, (values
  ('t61-due-01', 'Due 1', (now() - interval '2 hours')::text),
  ('t61-due-02', 'Due 2', (now() - interval '1 hour')::text),
  ('t61-not-due', 'Not due', (now() + interval '2 days')::text)
) as v(slug, title, scheduled_for)
where auth_user_id = 'd1000000-0000-0000-0000-000000000001';

set local role service_role;
select is(
  (select count(*)::int from api.publish_scheduled_items()),
  2,
  'publish_scheduled_items: publishes exactly the two past-due items'
);
reset role;

select is(
  (select status from publishing.items where slug = 't61-not-due'),
  'scheduled',
  'publish_scheduled_items: an item not yet due is left scheduled'
);

select * from finish();
rollback;
