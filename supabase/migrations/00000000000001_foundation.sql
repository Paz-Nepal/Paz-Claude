-- 0001_foundation.sql
-- Extensions and domain schema shells.
--
-- This migration creates no tables. It exists to establish, before anything
-- else, the extension set and the schema boundaries that every later
-- migration depends on (Architecture Blueprint §4.1; Build Readiness Review
-- §3.1, §3.3). Schemas are created in dependency order so a from-zero
-- migration run (CI: migrations-from-zero gate) can never race a
-- cross-schema foreign key against a schema that doesn't exist yet.

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email/text
create extension if not exists "pg_trgm";    -- fuzzy name matching (duplicate detection)
create extension if not exists "btree_gist"; -- exclusion constraints (reservation overlap, etc.)

-- ---------------------------------------------------------------------
-- Domain schemas (dependency order: identity -> authz -> everything else)
-- ---------------------------------------------------------------------
create schema if not exists identity;
comment on schema identity is
  'Canonical person records. Every other domain references identity.people; '
  'identity references nothing else in this database except auth.users.';

create schema if not exists authz;
comment on schema authz is
  'Roles, permissions, and grants. The only schema RLS policies are allowed '
  'to query, via authz.current_person_id() and authz.has_permission().';

create schema if not exists admin;
comment on schema admin is
  'Audit log and typed settings. Append-only; owns no domain business data.';

create schema if not exists publishing;
comment on schema publishing is
  'Unified content core (articles, PAZ Papers, Dispatch, Pigeon Post, pages) '
  'and its workflow, revisions, taxonomy, and media.';

create schema if not exists programs;
comment on schema programs is 'Programs, sessions, venues, registrations, attendance.';

create schema if not exists membership;
comment on schema membership is 'Tiers, applications, members, terms, benefits, digital card.';

create schema if not exists crm;
comment on schema crm is 'Organizations, institutional relationships, interactions, pledges.';

create schema if not exists hospitality;
comment on schema hospitality is 'Menus, service periods, tables, reservations.';

create schema if not exists analytics;
comment on schema analytics is
  'First-party, cookieless, append-only event sink and nightly rollups. '
  'No third-party trackers, ever (ADR-9).';

create schema if not exists api;
comment on schema api is
  'The only schema exposed to PostgREST (see supabase/config.toml [api] '
  'schemas). Contains curated views and RPC functions only -- never raw '
  'domain tables. Breaking a view''s shape requires a new versioned view '
  '(api.foo_v2) alongside the old one; additive columns may change in '
  'place (ADR-32, ''API surface versioning'').';

-- ---------------------------------------------------------------------
-- Shared helper: updated_at maintenance
-- ---------------------------------------------------------------------
-- Every table in every domain gets this trigger. Defined once here instead
-- of once per schema so behavior cannot drift between domains.
create function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at = now(). Attach to any '
  'table with an updated_at timestamptz column.';

-- ---------------------------------------------------------------------
-- Revoke-by-default posture
-- ---------------------------------------------------------------------
-- Application roles get no ambient privileges in domain schemas. Access is
-- granted explicitly, schema by schema, as each domain's objects are
-- created (Build Readiness Review §3.1). This statement is defensive: it
-- guarantees the default is closed even before any table exists.
revoke all on schema identity, authz, publishing, programs, membership, crm,
  hospitality, admin, analytics
  from anon, authenticated;
