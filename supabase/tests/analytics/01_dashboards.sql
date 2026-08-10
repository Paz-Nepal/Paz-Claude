-- analytics/01_dashboards.sql
--
-- Allow + deny for every analytics dashboard function in 0032_analytics.sql.
-- These are security-definer functions with an explicit permission check
-- in the function body (raise exception '42501'), not RLS policies -- no
-- table in the analytics schema exists at all (0032's own header: "a
-- dashboard needs aggregate counts across every row regardless of
-- row-level ownership"). Same allow/deny discipline applies regardless of
-- the mechanism, so each function gets both cases here.
begin;
select plan(12);

-- Fixtures: one person per dashboard-owning role, plus Nora with no role
-- at all for every deny case.
insert into auth.users (id, email) values
  ('f9000000-0000-0000-0000-000000000001', 'editor-dash@example.test'),
  ('f9000000-0000-0000-0000-000000000002', 'pm-dash@example.test'),
  ('f9000000-0000-0000-0000-000000000003', 'mm-dash@example.test'),
  ('f9000000-0000-0000-0000-000000000004', 'hm-dash@example.test'),
  ('f9000000-0000-0000-0000-000000000005', 'finance-dash@example.test'),
  ('f9000000-0000-0000-0000-000000000006', 'admin-dash@example.test'),
  ('f9000000-0000-0000-0000-000000000007', 'nora-dash@example.test');

insert into authz.user_roles (person_id, role_key)
select id, 'editor' from identity.people where auth_user_id = 'f9000000-0000-0000-0000-000000000001';
insert into authz.user_roles (person_id, role_key)
select id, 'program_manager' from identity.people where auth_user_id = 'f9000000-0000-0000-0000-000000000002';
insert into authz.user_roles (person_id, role_key)
select id, 'membership_manager' from identity.people where auth_user_id = 'f9000000-0000-0000-0000-000000000003';
insert into authz.user_roles (person_id, role_key)
select id, 'hospitality_manager' from identity.people where auth_user_id = 'f9000000-0000-0000-0000-000000000004';
insert into authz.user_roles (person_id, role_key)
select id, 'finance' from identity.people where auth_user_id = 'f9000000-0000-0000-0000-000000000005';
insert into authz.user_roles (person_id, role_key)
select id, 'administrator' from identity.people where auth_user_id = 'f9000000-0000-0000-0000-000000000006';

-- ---------------------------------------------------------------------
-- analytics.editorial_pipeline()
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select * from analytics.editorial_pipeline()$$,
  'editorial_pipeline (allow): editor with analytics.dashboard.editorial can call it'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000007", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from analytics.editorial_pipeline()$$,
  '42501',
  'editorial_pipeline (deny): a person without analytics.dashboard.editorial cannot call it'
);
reset role;

-- ---------------------------------------------------------------------
-- analytics.program_fill()
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select * from analytics.program_fill()$$,
  'program_fill (allow): program_manager with analytics.dashboard.programs can call it'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000007", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from analytics.program_fill()$$,
  '42501',
  'program_fill (deny): a person without analytics.dashboard.programs cannot call it'
);
reset role;

-- ---------------------------------------------------------------------
-- analytics.membership_funnel()
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select * from analytics.membership_funnel()$$,
  'membership_funnel (allow): membership_manager with analytics.dashboard.membership can call it'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000007", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from analytics.membership_funnel()$$,
  '42501',
  'membership_funnel (deny): a person without analytics.dashboard.membership cannot call it'
);
reset role;

-- ---------------------------------------------------------------------
-- analytics.reservation_load()
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000004", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select * from analytics.reservation_load()$$,
  'reservation_load (allow): hospitality_manager with analytics.dashboard.hospitality can call it'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000007", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from analytics.reservation_load()$$,
  '42501',
  'reservation_load (deny): a person without analytics.dashboard.hospitality cannot call it'
);
reset role;

-- ---------------------------------------------------------------------
-- analytics.finance_summary()
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000005", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select * from analytics.finance_summary()$$,
  'finance_summary (allow): finance with analytics.dashboard.finance can call it'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000007", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from analytics.finance_summary()$$,
  '42501',
  'finance_summary (deny): a person without analytics.dashboard.finance cannot call it'
);
reset role;

-- ---------------------------------------------------------------------
-- analytics.institution_vitals() / api.institution_vitals()
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000006", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select * from api.institution_vitals()$$,
  'institution_vitals (allow, via the api wrapper): administrator (blanket grant) can call it'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "f9000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select * from analytics.institution_vitals()$$,
  '42501',
  'institution_vitals (deny): editor (has editorial dashboard access, not vitals) cannot call it'
);
reset role;

select * from finish();
rollback;
