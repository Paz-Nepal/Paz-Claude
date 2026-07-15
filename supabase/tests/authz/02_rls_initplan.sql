-- authz/02_rls_initplan.sql
--
-- Build Readiness Review §3.4: the single most common Supabase RLS
-- performance mistake is calling a stable authorization function bare
-- inside a policy instead of wrapped as `(select fn(...))`, which forces
-- Postgres to re-evaluate it per row instead of once per statement. This
-- test proves the idiom actually works as claimed on a real policy,
-- rather than trusting the comment in the migration. It is a planner-
-- behavior smoke check (Postgres plan shapes can vary across versions);
-- the per-phase committed EXPLAINs in docs/perf/ are the primary,
-- ongoing safeguard -- this test just catches an obvious regression, e.g.
-- someone "simplifying" a policy back to a bare function call.
begin;
select plan(1);

create temporary table plan_output (line text);

do $do$
declare
  v_line text;
begin
  execute 'set local role authenticated';
  execute $jwt$ set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000000", "role": "authenticated"}' $jwt$;

  for v_line in execute
    'explain (format text) select 1 from identity.people where auth_user_id = gen_random_uuid()'
  loop
    insert into plan_output (line) values (v_line);
  end loop;

  execute 'reset role';
end
$do$;

select ok(
  exists (select 1 from plan_output where line ilike '%InitPlan%'),
  'The staff-read policy on identity.people (using (select authz.has_staff_permission(...))) '
  'is planned as an InitPlan, confirming it evaluates once per statement rather than per row'
);

select * from finish();
rollback;
