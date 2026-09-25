-- house/03_press_and_record.sql
--
-- 0084 (Pigeon Post reach, places tended, the afternoons), 0085 (the Record's
-- catalogue) and 0088 (objects): counts never names, a Pigeon Post count only
-- for a Pigeon Post, a photograph always names its maker, a number only after
-- an agreement, never changed, one ruling, no perpetual seal, no account of
-- content before a holding opens, a withdrawn giver leaves a numbered gap, the
-- closed layer belongs to the Keeper alone, consent lines are never edited,
-- and the listening log loses its names but keeps its count.
begin;
select plan(23);

insert into auth.users (id, email) values
  ('ff000000-0000-0000-0000-000000000001', 'sa-record@example.test'),
  ('ff000000-0000-0000-0000-000000000002', 'ed-record@example.test');
insert into authz.user_roles (person_id, role_key)
select id, 'super_admin' from identity.people where auth_user_id = 'ff000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'ff000000-0000-0000-0000-000000000002';

insert into publishing.items (id, type, slug, title, author, status, published_at)
select 'ff600000-0000-0000-0000-000000000001', 'pigeon_post', 'record-pigeon', 'Record Pigeon', id, 'published', now()
from identity.people where auth_user_id = 'ff000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "ff000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';

-- Pigeon Post reach
select lives_ok(
  $$ select api.save_pigeon_distribution(jsonb_build_object('item_id', 'ff600000-0000-0000-0000-000000000001', 'country', 'Canada', 'copies', 12)) $$,
  'a Pigeon Post count can be saved'
);
select throws_ok(
  $$ select api.save_pigeon_distribution(jsonb_build_object('item_id', (select id from publishing.items where type <> 'pigeon_post' limit 1), 'country', 'X', 'copies', 1)) $$,
  '23514', null, 'a count is kept only for a Pigeon Post edition'
);

-- Places tended
select lives_ok(
  $$ select api.save_encounter_place_visit(jsonb_build_object(
       'place_id', api.save_encounter_place('{"slug":"record-hiti","name":"Record Hiti","kind":"hiti","published":true}'::jsonb),
       'done_on', '2026-03-03', 'people_count', 14, 'published', true)) $$,
  'a visit to a place is recorded as a count'
);
select throws_ok(
  $$ select api.save_encounter_place_visit(jsonb_build_object(
       'place_id', (select id from encounters.places where slug = 'record-hiti'),
       'done_on', '2026-03-04', 'before_image', jsonb_build_object('original_path', 'x.jpg'))) $$,
  '23514', null, 'a photograph without its size, words and photographer is refused'
);

-- The afternoons
select lives_ok(
  $$ select api.save_encounter(jsonb_build_object('slug', 'record-afternoon', 'kind', 'workshop', 'title', 'Record Afternoon',
       'starts_on', '2026-05-05', 'series', 'the-painting-afternoon', 'price_note', 'NPR 500', 'published', true)) $$,
  'an Encounter can belong to a named series with a price note'
);

-- The Record's catalogue
select lives_ok(
  $$ select api.save_record_accession(jsonb_build_object('id', 'ff700000-0000-0000-0000-000000000001', 'kind', 'papers',
       'listening_tier', 'family_only', 'description_level', 'subjects', 'description', 'Letters, 1970s',
       'opens_on', '2100-01-01', 'published', true)) $$,
  'an accession can be saved'
);
select throws_ok(
  $$ select api.assign_record_accession_number('ff700000-0000-0000-0000-000000000001') $$,
  '23514', null, 'a number is given only after an agreement is on file'
);
select throws_ok(
  $$ select api.save_record_accession(jsonb_build_object('kind', 'voice', 'listening_tier', 'no_one', 'description_level', 'none')) $$,
  '23514', null, 'a holding closed to everyone must name the date it opens'
);
select lives_ok(
  $$ select api.add_record_consent_line('ff700000-0000-0000-0000-000000000001', 'agreed', 'Agreed at the house, witnessed.') $$,
  'a consent line is recorded'
);
select matches(
  (select api.assign_record_accession_number('ff700000-0000-0000-0000-000000000001')), '^PTN-[0-9]{4,}$',
  'the number is given once an agreement is on file'
);
select is(
  (select count(*)::int from api.admin_record_parts where accession_id = 'ff700000-0000-0000-0000-000000000001' and is_consents), 1,
  'and the first part is its consents'
);
select throws_ok(
  $$ update record.accessions set number = 'PTN-9999' where id = 'ff700000-0000-0000-0000-000000000001' $$,
  '42501', null, 'the base table is never written directly'
);
select lives_ok(
  $$ select api.record_listening('ff700000-0000-0000-0000-000000000001', null, 'Some Listener') $$,
  'a listening is recorded'
);
select lives_ok(
  $$ select api.save_record_closed(jsonb_build_object('accession_id', 'ff700000-0000-0000-0000-000000000001', 'giver', 'Secret Giver')) $$,
  'the Keeper can keep the closed layer'
);
select lives_ok(
  $$ select api.save_object('{"slug":"record-print","title":"A print","kind":"print","published":true}'::jsonb) $$,
  'an object for sale can be saved'
);

-- The public
reset role;
set local role anon;
select is(
  (select description from api.record_accessions where kind = 'papers' and listening_tier = 'family_only'),
  null,
  'no account of the content is shown before a holding opens'
);
select is(
  (select count(*)::int from api.pigeon_post_reach where country = 'Canada'), 1,
  'the public sees copies by country'
);
select throws_ok(
  $$ select count(*) from record.closed $$,
  '42501', null, 'the closed layer is not reachable by the public'
);

-- Someone who is not the Keeper
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "ff000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from api.admin_record_closed), 0,
  'an editor does not see the closed layer'
);
select throws_ok(
  $$ select api.save_record_closed(jsonb_build_object('accession_id', 'ff700000-0000-0000-0000-000000000001', 'giver', 'x')) $$,
  '42501', null, 'an editor cannot write the closed layer'
);

-- Withdrawal leaves a numbered gap; consent lines are never edited
set local request.jwt.claims = '{"sub": "ff000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$ select api.withdraw_record_accession('ff700000-0000-0000-0000-000000000001') $$,
  'a giver can withdraw'
);
reset role;
select throws_ok(
  $$ update record.consent_lines set line = 'changed' where accession_id = 'ff700000-0000-0000-0000-000000000001' $$,
  '42501', null, 'a consent line is never edited'
);
update record.listenings set listened_at = now() - interval '400 days';
update admin.settings set value = '30'::jsonb where key = 'record.listening_names_days';
select is(record.strip_listening_names(), 1, 'names in the listening log are stripped after the period');

select finish();
rollback;
