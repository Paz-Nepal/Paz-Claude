-- 00_smoke.sql
-- Runs after `supabase db reset` in CI's migrations-from-zero step. If this
-- fails, nothing else about the database can be trusted, so it is test 00.
begin;
select plan(11);

select has_schema('identity');
select has_schema('authz');
select has_schema('admin');
select has_schema('publishing');
select has_schema('programs');
select has_schema('membership');
select has_schema('crm');
select has_schema('hospitality');
select has_schema('analytics');
select has_schema('api');

select has_extension('pgcrypto');

select * from finish();
rollback;
