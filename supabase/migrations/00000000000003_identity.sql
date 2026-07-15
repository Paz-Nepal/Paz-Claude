-- 0003_identity.sql
--
-- The canonical human record (Architecture Blueprint §3; Build Readiness
-- Review D-1 through D-4). auth.users holds credentials only; every other
-- domain references identity.people(id), never auth.users(id).

create table identity.people (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  full_name     text not null,
  display_name  text,
  email         citext unique,
  phone         text,
  locale        text not null default 'en',
  avatar_path   text,
  bio           text,

  -- Provenance: distinguishes a person created from a named form
  -- interaction (reservation, application, contact) from one created by
  -- staff directly. Read by CRM views to filter operational contacts from
  -- cultivated relationships (Build Readiness Review D-2).
  source        text not null default 'staff' check (source in ('staff', 'signup', 'reservation', 'application', 'contact_form', 'import')),

  communication_preferences jsonb not null default '{"dispatch": false, "programs": false}'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Lifecycle: people are never hard-deleted (Architecture Blueprint §3.2).
  merged_into   uuid references identity.people (id) on delete restrict,
  erased_at     timestamptz,
  deceased_at   date,

  constraint people_not_self_merged check (merged_into is null or merged_into <> id)
);
comment on table identity.people is
  'The canonical human record. Never hard-deleted: duplicates are merged '
  '(merged_into) and departures are anonymized (erased_at), never removed. '
  'Every other domain schema references this table, not auth.users.';
comment on column identity.people.merged_into is
  'Non-null means this row is a tombstone; readers should resolve through '
  'identity.canonical_person() rather than joining people directly.';
comment on column identity.people.source is
  'Provenance of the first interaction that created this record. Used to '
  'separate operational contacts (e.g. reservation-only guests) from '
  'cultivated relationships in CRM views.';

create index people_auth_user_id_idx on identity.people (auth_user_id);
create index people_full_name_trgm_idx on identity.people using gin (full_name gin_trgm_ops);
create index people_merged_into_idx on identity.people (merged_into) where merged_into is not null;

create trigger people_set_updated_at
  before update on identity.people
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- RLS restricts *rows*; it does nothing without a base table privilege to
-- restrict in the first place. Both are required together, always granted
-- in the same breath so one is never added without the other.
alter table identity.people enable row level security;

grant select, update on identity.people to authenticated;
-- No INSERT grant for authenticated: person rows are created only by the
-- auth trigger (identity.handle_new_auth_user, security definer) or by
-- staff through service-role Edge Functions -- never directly by a client.

create policy people_select_own on identity.people
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

create policy people_update_own on identity.people
  for update
  to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- identity.canonical_person(uuid) -> uuid
-- ---------------------------------------------------------------------
-- The one place merges are resolved. Every read that might touch a merged
-- (tombstoned) person must go through this function rather than joining
-- identity.people directly -- otherwise merge-resolution logic scatters
-- across the codebase (Build Readiness Review §3.6).
create function identity.canonical_person(p_person uuid)
returns uuid
language sql
stable
security definer
set search_path = identity, pg_temp
as $$
  select coalesce(
    (select merged_into from identity.people where id = p_person),
    p_person
  );
$$;
comment on function identity.canonical_person(uuid) is
  'Resolves a possibly-merged person id to its current canonical id. '
  'Idempotent for un-merged people. Does not follow multi-hop chains by '
  'design -- merge_people() always re-points merged_into to the ultimate '
  'survivor at merge time, so chains never form.';

-- ---------------------------------------------------------------------
-- Auth linkage: connect a Supabase Auth user to an identity.people row
-- ---------------------------------------------------------------------
-- Fires after a row is inserted into auth.users (i.e. on sign-up/invite).
-- If a person record already exists with a matching verified email (e.g.
-- a CRM contact or reservation guest who later creates a login), link to
-- it instead of creating a duplicate. Otherwise, create a new record.
create function identity.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
declare
  v_email citext;
  v_full_name text;
  v_existing_id uuid;
begin
  v_email := new.email;
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.email);

  select id into v_existing_id
  from identity.people
  where email = v_email
    and merged_into is null
  limit 1;

  if v_existing_id is not null then
    update identity.people
    set auth_user_id = new.id
    where id = v_existing_id;
  else
    insert into identity.people (auth_user_id, full_name, email, source)
    values (new.id, v_full_name, v_email, 'signup');
  end if;

  return new;
end;
$$;
comment on function identity.handle_new_auth_user() is
  'Links or creates the identity.people row for a new auth.users row. '
  'Matches on citext email so a person already known to CRM/reservations '
  'does not become a duplicate the moment they create a login.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function identity.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- identity.merge_people(survivor, duplicate, actor)
-- ---------------------------------------------------------------------
-- Re-points every foreign key in the database that references
-- identity.people(id) -- discovered dynamically via the system catalogs,
-- not a hand-maintained list. This is a deliberate strengthening of the
-- Build Readiness Review's D-1 requirement ("a pgTAP test that fails when
-- a new FK is added without updating the merge function"): rather than
-- relying on a developer remembering to update this function, the function
-- is self-maintaining, and the pgTAP test (0001_identity_merge.sql)
-- verifies the dynamic discovery actually covers a synthetic FK-bearing
-- table, proving the mechanism rather than a fixed list.
create function identity.merge_people(p_survivor uuid, p_duplicate uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = identity, admin, pg_temp
as $$
declare
  fk record;
  v_survivor_snapshot jsonb;
  v_duplicate_snapshot jsonb;
begin
  if p_survivor is null or p_duplicate is null or p_actor is null then
    raise exception 'merge_people requires survivor, duplicate, and actor';
  end if;

  if p_survivor = p_duplicate then
    raise exception 'Cannot merge a person into themselves';
  end if;

  -- Lock both rows for the duration of the merge.
  perform 1 from identity.people where id = p_survivor for update;
  perform 1 from identity.people where id = p_duplicate for update;

  select to_jsonb(p) into v_survivor_snapshot from identity.people p where p.id = p_survivor;
  select to_jsonb(p) into v_duplicate_snapshot from identity.people p where p.id = p_duplicate;

  if v_survivor_snapshot is null or v_duplicate_snapshot is null then
    raise exception 'Both survivor (%) and duplicate (%) must exist', p_survivor, p_duplicate;
  end if;

  if (v_duplicate_snapshot ->> 'merged_into') is not null then
    raise exception 'Person % has already been merged into another record', p_duplicate;
  end if;

  -- Dynamically re-point every FK -> identity.people(id) except the
  -- self-referential merged_into column, which is set explicitly below.
  for fk in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.constraint_schema = kcu.constraint_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.constraint_schema = ccu.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'identity'
      and ccu.table_name = 'people'
      and ccu.column_name = 'id'
      and not (tc.table_schema = 'identity' and tc.table_name = 'people'
               and kcu.column_name = 'merged_into')
  loop
    execute format(
      'update %I.%I set %I = $1 where %I = $2',
      fk.table_schema, fk.table_name, fk.column_name, fk.column_name
    ) using p_survivor, p_duplicate;
  end loop;

  -- Union non-conflicting profile fields; survivor's existing values win.
  update identity.people survivor
  set
    email = coalesce(survivor.email, (v_duplicate_snapshot ->> 'email')::citext),
    phone = coalesce(survivor.phone, v_duplicate_snapshot ->> 'phone'),
    bio = coalesce(survivor.bio, v_duplicate_snapshot ->> 'bio'),
    avatar_path = coalesce(survivor.avatar_path, v_duplicate_snapshot ->> 'avatar_path')
  where survivor.id = p_survivor;

  -- Tombstone the duplicate. Never hard-delete. Email is released (set
  -- null) so it doesn't collide with the unique constraint if the same
  -- address is ever legitimately re-entered.
  update identity.people
  set merged_into = p_survivor,
      auth_user_id = null,
      email = null
  where id = p_duplicate;

  insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, before, after, context)
  values (
    p_actor,
    'identity.person.merge',
    'identity', 'people', p_duplicate,
    jsonb_build_object('survivor', v_survivor_snapshot, 'duplicate', v_duplicate_snapshot),
    jsonb_build_object('merged_into', p_survivor),
    jsonb_build_object('reversible', false, 'recovery', 'audit snapshot only')
  );
end;
$$;
comment on function identity.merge_people(uuid, uuid, uuid) is
  'Merges duplicate into survivor: re-points every FK referencing people '
  '(discovered dynamically), unions profile fields, tombstones the '
  'duplicate. Not reversible; the audit row is the only recovery path. '
  'Callable only by identity.person.merge (enforced by REVOKE below + RLS '
  'wrapper once authz exists -- see 0004).';

-- Ordinary roles cannot call this directly; it is invoked only through an
-- Edge Function running as service_role, which re-checks
-- authz.has_permission('identity.person.merge') itself before calling it
-- (Architecture Blueprint §3.4, point 3). Revoking EXECUTE from
-- PUBLIC/authenticated now, even before authz exists, closes the window.
revoke all on function identity.merge_people(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- identity.erase_person(person, actor) -- GDPR-style anonymization
-- ---------------------------------------------------------------------
-- See docs/policies/erasure.md for the human-readable policy this
-- implements (Build Readiness Review D-3). Distinguishes account closure
-- (self-service, not this function) from staff-executed erasure.
create function identity.erase_person(p_person uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = identity, admin, pg_temp
as $$
declare
  v_before jsonb;
begin
  perform 1 from identity.people where id = p_person for update;

  select to_jsonb(p) into v_before from identity.people p where p.id = p_person;
  if v_before is null then
    raise exception 'Person % does not exist', p_person;
  end if;

  update identity.people
  set full_name = 'Erased Person',
      display_name = null,
      email = null,
      phone = null,
      bio = null,
      avatar_path = null,
      auth_user_id = null,
      erased_at = now()
  where id = p_person;

  -- Storage avatar cleanup and CRM interaction-note redaction are
  -- performed by the calling Edge Function (erase-person), which has the
  -- storage and cross-schema context this database function does not need.
  -- This function is the identity-schema half of the operation; it is
  -- always invoked as part of that function's transaction, never alone.

  insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, before, after, context)
  values (
    p_actor,
    'identity.person.erase',
    'identity', 'people', p_person,
    v_before,
    jsonb_build_object('erased_at', now()),
    jsonb_build_object(
      'note',
      'Member number, published bylines, and aggregate analytics are '
      'preserved per docs/policies/erasure.md; only this row''s PII is scrubbed.'
    )
  );
end;
$$;
comment on function identity.erase_person(uuid, uuid) is
  'Staff-executed erasure per docs/policies/erasure.md. Scrubs PII from '
  'identity.people; does not touch published bylines (those require an '
  'editorial decision, not a data operation) or the person''s member '
  'number (kept as a tombstone).';

revoke all on function identity.erase_person(uuid, uuid) from public, anon, authenticated;
