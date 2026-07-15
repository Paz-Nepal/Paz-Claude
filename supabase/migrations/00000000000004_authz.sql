-- 0004_authz.sql
--
-- Roles and permissions as data (Architecture Blueprint §3.3). RLS policies
-- everywhere else in the database call exactly two functions from this
-- schema -- authz.current_person_id() and authz.has_permission() -- and
-- nothing else. This is what keeps authorization auditable and evolvable
-- without a code deploy: granting or revoking access is a data change.

create table authz.roles (
  key         text primary key,
  name        text not null,
  description text
);
comment on table authz.roles is 'Seeded reference data -- see supabase/seed/authz.sql.';

create table authz.permissions (
  key         text primary key,  -- 'domain.entity.action', e.g. 'publishing.item.publish'
  description text
);
comment on table authz.permissions is
  'Full catalog kept in sync with docs/authz-matrix.md by a CI check '
  '(scripts/check-authz-matrix.ts) -- the doc and the seed must never drift.';

create table authz.role_permissions (
  role_key       text not null references authz.roles (key) on delete cascade,
  permission_key text not null references authz.permissions (key) on delete cascade,
  primary key (role_key, permission_key)
);

create table authz.user_roles (
  person_id  uuid not null references identity.people (id) on delete restrict,
  role_key   text not null references authz.roles (key) on delete restrict,
  granted_by uuid references identity.people (id) on delete restrict,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,  -- time-boxed grants, e.g. a Volunteer's event-day access
  primary key (person_id, role_key)
);
comment on table authz.user_roles is
  'Grants are reviewed quarterly per docs/runbooks/access-review.md. '
  'expires_at makes short-lived grants (Volunteer, event day) self-revoking '
  'rather than dependent on someone remembering to remove them.';

create index user_roles_person_idx on authz.user_roles (person_id);
create index user_roles_expiry_idx on authz.user_roles (expires_at) where expires_at is not null;

-- ---------------------------------------------------------------------
-- authz.current_person_id() -> uuid
-- ---------------------------------------------------------------------
-- Resolves the JWT's auth.uid() to the caller's identity.people.id, already
-- passed through canonical_person() so a merged account never silently
-- loses access. `stable` (not `volatile`) is what allows Postgres to
-- evaluate this once per statement instead of once per row when it
-- appears inside an RLS policy wrapped in `(select ...)` -- see the
-- initplan note on has_permission() below; the same reasoning applies here.
create function authz.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = identity, pg_temp
as $$
  select identity.canonical_person(p.id)
  from identity.people p
  where p.auth_user_id = auth.uid();
$$;
comment on function authz.current_person_id() is
  'auth.uid() -> canonical identity.people.id for the current request. '
  'Returns null for anonymous/unauthenticated callers.';

-- ---------------------------------------------------------------------
-- authz.has_permission(text) -> boolean
-- ---------------------------------------------------------------------
create function authz.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = authz, pg_temp
as $$
  select exists (
    select 1
    from authz.user_roles ur
    join authz.role_permissions rp on rp.role_key = ur.role_key
    where ur.person_id = authz.current_person_id()
      and rp.permission_key = p_permission
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;
comment on function authz.has_permission(text) is
  'THE function every RLS policy in the database calls to decide access. '
  'PERFORMANCE-CRITICAL: always call as `(select authz.has_permission(...))` '
  'inside a policy, never bare. The `select` wrapper makes Postgres treat '
  'the stable function as an initplan, evaluated once per statement -- '
  'omitting it makes Postgres re-evaluate per row, which is the single '
  'most common RLS performance mistake (Build Readiness Review §3.4). A '
  'pgTAP test (0002_authz_initplan.sql) EXPLAINs a representative policy '
  'and asserts an InitPlan node is present, not a per-row SubPlan.';

-- ---------------------------------------------------------------------
-- authz.require_aal2() -> boolean
-- ---------------------------------------------------------------------
-- Staff-permission RLS checks additionally require MFA (aal2) to have been
-- used in the current session (Architecture Blueprint §8.2). This reads
-- the JWT claim Supabase Auth sets after a successful TOTP challenge.
create function authz.session_aal()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1');
$$;
comment on function authz.session_aal() is
  'Authenticator Assurance Level from the current JWT: aal1 (password '
  'only) or aal2 (password + MFA). Staff-permission checks require aal2 '
  '-- see authz.has_staff_permission().';

create function authz.has_staff_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = authz, pg_temp
as $$
  select (select authz.session_aal()) = 'aal2'
     and (select authz.has_permission(p_permission));
$$;
comment on function authz.has_staff_permission(text) is
  'Use this (not has_permission directly) for any RLS policy gating a '
  'staff-only action -- it adds the mandatory MFA requirement. Member-'
  'facing policies (a member reading their own data) use has_permission '
  'or a direct ownership check instead; MFA is a staff requirement, not a '
  'member one.';

-- ---------------------------------------------------------------------
-- Table-level grants
-- ---------------------------------------------------------------------
-- Reference data (roles, permissions, role_permissions) is readable by
-- authenticated users -- knowing that an "Editor" role exists is not
-- sensitive, and the admin console's role-assignment UI needs to list
-- roles/permissions to staff who can grant them. user_roles (who has what)
-- is more sensitive and is scoped by RLS below.
grant select on authz.roles, authz.permissions, authz.role_permissions to authenticated;
grant select on authz.user_roles to authenticated;

alter table authz.user_roles enable row level security;

create policy user_roles_select_own on authz.user_roles
  for select
  to authenticated
  using (person_id = (select authz.current_person_id()));

create policy user_roles_select_staff on authz.user_roles
  for select
  to authenticated
  using ((select authz.has_staff_permission('authz.user_role.read')));

create policy user_roles_manage_staff on authz.user_roles
  for all
  to authenticated
  using ((select authz.has_staff_permission('authz.user_role.grant')))
  with check ((select authz.has_staff_permission('authz.user_role.grant')));

-- ---------------------------------------------------------------------
-- Now that authz exists, add the staff-wide policy on identity.people
-- ---------------------------------------------------------------------
-- (The self-access policies were added in 0003, before authz existed.)
create policy people_select_staff on identity.people
  for select
  to authenticated
  using ((select authz.has_staff_permission('identity.person.read')));

create policy people_update_staff on identity.people
  for update
  to authenticated
  using ((select authz.has_staff_permission('identity.person.update')))
  with check ((select authz.has_staff_permission('identity.person.update')));

-- ---------------------------------------------------------------------
-- Now that identity.people exists, attach the FK admin.audit_log.actor
-- deferred from migration 0002.
-- ---------------------------------------------------------------------
alter table admin.audit_log
  add constraint audit_log_actor_fkey
  foreign key (actor) references identity.people (id) on delete restrict;
