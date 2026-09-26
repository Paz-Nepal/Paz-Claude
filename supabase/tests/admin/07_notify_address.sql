-- admin/07_notify_address.sql
--
-- 0091: who is told that something is waiting. A safeguarding concern goes only
-- to the address named for it and never falls back to a general one; everything
-- else falls back to the site's contact address until a desk address is set.
begin;
select plan(5);

insert into admin.settings (key, value) values
  ('site.contact_email', '"contact@example.test"'::jsonb)
on conflict (key) do update set value = excluded.value;
update admin.settings set value = 'null'::jsonb where key in ('notify.concerns_email', 'notify.desk_email');

set local role service_role;
select is(api.notify_address('concern'), null, 'a concern with no named holder tells no one');
select is(api.notify_address('desk'), 'contact@example.test', 'the desk falls back to the contact address');

reset role;
update admin.settings set value = '"desk@example.test"'::jsonb where key = 'notify.desk_email';
update admin.settings set value = '"holder@example.test"'::jsonb where key = 'notify.concerns_email';
set local role service_role;
select is(api.notify_address('desk'), 'desk@example.test', 'a named desk address wins');
select is(api.notify_address('concern'), 'holder@example.test', 'a concern goes to its own holder');

reset role;
set local role authenticated;
select throws_ok(
  $$ select api.notify_address('concern') $$,
  '42501', null, 'a signed-in person cannot look the address up'
);

select finish();
rollback;
