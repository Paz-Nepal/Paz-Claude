-- synthetic.sql (LOCAL DEVELOPMENT ONLY)
--
-- Apply explicitly: psql "$SUPABASE_DB_URL" -f supabase/seed/synthetic.sql
-- Never wired into `supabase db reset`'s automatic seed path (see
-- supabase/config.toml [db.seed] sql_paths) and never run against staging
-- or production — staging uses anonymized production data per the
-- Architecture Blueprint §8.3, not fabricated fixtures.

insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-0000-0000-000000000001', 'admin@paz.local', '{"full_name": "Local Admin"}'),
  ('d0000000-0000-0000-0000-000000000002', 'editor@paz.local', '{"full_name": "Local Editor"}')
on conflict (id) do nothing;

-- identity.handle_new_auth_user creates the corresponding people rows.

insert into authz.user_roles (person_id, role_key, granted_by)
select p.id, 'super_admin', p.id
from identity.people p
where p.auth_user_id = 'd0000000-0000-0000-0000-000000000001'
on conflict do nothing;

insert into authz.user_roles (person_id, role_key, granted_by)
select p.id, 'editor', a.id
from identity.people p, identity.people a
where p.auth_user_id = 'd0000000-0000-0000-0000-000000000002'
  and a.auth_user_id = 'd0000000-0000-0000-0000-000000000001'
on conflict do nothing;
