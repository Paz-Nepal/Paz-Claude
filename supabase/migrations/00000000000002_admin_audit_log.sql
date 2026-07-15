-- 0002_admin_audit_log.sql
--
-- SEQUENCING NOTE (recorded decision, not a reopened decision):
-- The Build Readiness Review's dependency graph places `admin` third
-- (identity -> authz -> admin) specifically so every later domain is "born
-- audited." In practice identity's own merge/erase functions (next
-- migration) need to write audit rows the moment they exist, or identity
-- itself would be born unaudited -- the exact problem that ordering was
-- meant to prevent. Smallest correction: split `admin` into two arrivals.
-- The audit log's *structure* lands here, one migration ahead of identity,
-- purely so identity can log to it immediately. The rest of the admin
-- domain (settings, the generic per-table audit trigger, and audit-log RLS
-- policies that depend on authz.has_permission) still lands after authz, in
-- migration 0006, matching the originally approved order. No architectural
-- decision is reopened; this only resolves a two-migration bootstrapping
-- wrinkle.

create table admin.audit_log (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz not null default now(),
  actor         uuid,              -- FK added once identity.people exists (0003)
  action        text not null,     -- 'identity.person.merge', 'publishing.item.publish', ...
  entity_schema text,
  entity_table  text,
  entity_id     uuid,              -- intentionally NOT a foreign key: audit must
                                    -- outlive anything it describes
  before        jsonb,
  after         jsonb,
  context       jsonb              -- ip, user agent, edge function name, notes
);
comment on table admin.audit_log is
  'Append-only institutional memory. No update or delete grants exist for '
  'any role, including Super Admin -- see grants below. Retention is '
  'permanent; PII is minimized at write time, never deleted after the '
  'fact (Architecture Blueprint §4.7).';
comment on column admin.audit_log.entity_id is
  'Deliberately not a foreign key: an audit row must remain readable even '
  'after the entity it describes is merged, archived, or erased.';

create index audit_log_occurred_at_idx on admin.audit_log (occurred_at desc);
create index audit_log_entity_idx on admin.audit_log (entity_table, entity_id);
create index audit_log_actor_idx on admin.audit_log (actor);

-- Append-only, mechanically. Nobody -- no role, no exception -- gets
-- update or delete. This is enforced at the grant level, not by RLS, so it
-- holds even for a service_role connection.
alter table admin.audit_log enable row level security;

revoke update, delete on admin.audit_log from public, anon, authenticated;

-- No SELECT policy yet: until authz exists (0004) and its permission keys
-- are seeded, the audit log is readable by nobody through PostgREST/RLS.
-- This is the safe default the doctrine requires ("a table with no policy
-- is inaccessible") -- migration 0006 adds the Administrator-only read
-- policy once authz.has_permission is available to express it.
