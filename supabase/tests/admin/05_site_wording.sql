-- admin/05_site_wording.sql
--
-- The site's fixed wording (0080_site_wording.sql): anyone may read the
-- rewordings, only site.wording.manage may write them, blank means "back to
-- the default", the house style holds, and every change is audited. Also
-- the Friends tiers form: only membership.tier.manage may save a tier, and
-- the Nepali columns reach the public view.
begin;
select plan(15);

insert into auth.users (id, email) values
  ('fb000000-0000-0000-0000-000000000001', 'editor-wording@example.test'),
  ('fb000000-0000-0000-0000-000000000002', 'nobody-wording@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'fb000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- Writing: allowed for the editor
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';

select lives_ok(
  $$ select api.save_site_wording('nav.wall', 'The Gallery', null) $$,
  'save_site_wording (allow): an editor can reword a line'
);
select lives_ok(
  $$ select api.save_site_wording('nav.wall', 'The Gallery', 'भित्ता') $$,
  'save_site_wording (allow): saving again replaces the rewording'
);
select throws_ok(
  $$ select api.save_site_wording('nav.house', 'The House ' || chr(8212) || ' ours', null) $$,
  '23514',
  null,
  'save_site_wording: an em dash is refused'
);
select throws_ok(
  $$ select api.save_site_wording('Not A Key', 'x', null) $$,
  '23514',
  null,
  'save_site_wording: a malformed key is refused'
);
reset role;

-- ---------------------------------------------------------------------
-- Reading: public
-- ---------------------------------------------------------------------
set local role anon;
select is(
  (select en from api.site_wording() where key = 'nav.wall'),
  'The Gallery',
  'site_wording: an anonymous reader sees the English rewording'
);
select is(
  (select ne from api.site_wording() where key = 'nav.wall'),
  'भित्ता',
  'site_wording: and the Nepali'
);
select throws_ok(
  $$ select api.save_site_wording('nav.wall', 'Anon was here', null) $$,
  '42501',
  null,
  'save_site_wording (deny): an anonymous reader cannot write'
);
reset role;

-- ---------------------------------------------------------------------
-- Writing: refused for someone without the permission
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$ select api.save_site_wording('nav.wall', 'Mine now', null) $$,
  '42501',
  null,
  'save_site_wording (deny): a person without site.wording.manage cannot write'
);
select throws_ok(
  $$ select count(*) from admin.site_wording $$,
  '42501',
  null,
  'admin.site_wording: the table itself is closed; reading goes through api.site_wording()'
);
reset role;

select is(
  (select en from admin.site_wording where key = 'nav.wall'),
  'The Gallery',
  'the refused writes changed nothing'
);

-- ---------------------------------------------------------------------
-- Back to the default, and the audit trail
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select api.save_site_wording('nav.wall', '  ', null);
reset role;

select is(
  (select count(*)::int from admin.site_wording where key = 'nav.wall'),
  0,
  'save_site_wording: both blank removes the rewording, so the default returns'
);
select is(
  (select array_agg(action order by id) from admin.audit_log where entity_table = 'site_wording'),
  array['site.wording.save', 'site.wording.save', 'site.wording.reset'],
  'every save and reset is in the audit log'
);

-- ---------------------------------------------------------------------
-- Friends tiers
-- ---------------------------------------------------------------------
insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where auth_user_id = 'fb000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$ select api.save_membership_tier('{"key": "friend", "name": "Friend", "name_ne": "मित्र", "description": "A modest yearly gift.", "annual_fee_cents": 250000, "active": true}'::jsonb) $$,
  'save_membership_tier (allow): an administrator can reword and reprice a tier'
);
reset role;

set local role anon;
select is(
  (select name_ne from api.membership_tiers where key = 'friend'),
  'मित्र',
  'api.membership_tiers: the Nepali name reaches the public form'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "fb000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$ select api.save_membership_tier('{"key": "friend", "name": "Free", "annual_fee_cents": 0}'::jsonb) $$,
  '42501',
  null,
  'save_membership_tier (deny): a person without membership.tier.manage cannot change a tier'
);
reset role;

select * from finish();
rollback;
