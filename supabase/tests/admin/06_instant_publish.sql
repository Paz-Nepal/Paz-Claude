-- admin/06_instant_publish.sql
--
-- 0090: writing to a table the public site shows marks the site dirty; a render
-- starts only when there is a reason to (a change, a redeployed app, a failed
-- attempt) and never twice at once; and the shared secret is the service role's.
begin;
select plan(7);

update admin.site_render_state
   set dirty = false, dirty_since = null, running_since = null, last_ok = true, shell_hash = 'h1'
 where id = 1;

insert into admin.settings (key, value) values ('test.publish', '"x"'::jsonb);
select is(
  (select dirty from admin.site_render_state where id = 1), true,
  'writing a table the site shows marks it dirty'
);

set local role service_role;
select is(api.site_render_begin('h1'), true, 'a dirty site renders');
select is(api.site_render_begin('h1'), false, 'and not again while that render is running');
select lives_ok(
  $$ select api.site_render_finish(true, 'ok', 5, 'h1') $$,
  'a finished render is recorded'
);
select is(api.site_render_begin('h1'), false, 'a clean site with an unchanged app has nothing to do');
select is(api.site_render_begin('h2'), true, 'a redeployed app (a new shell) renders again');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000000", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$ select api.site_render_secret() $$,
  '42501', null, 'the shared secret is not readable by a signed-in person'
);

select finish();
rollback;
