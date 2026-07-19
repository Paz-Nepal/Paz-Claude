-- 0025_publishing_deposit_model.sql
--
-- PAZ Website & CMS spec: the real deposit model. Adds bilingual fields,
-- structured provenance, per-series extension tables, the Record (public
-- deposit index), and append-only enforcement for deposited content.
--
-- Vocabulary note: the spec's "deposited" is this schema's existing
-- 'published' status — kept as-is rather than renamed (no real content
-- has ever been deposited yet, so the rename would be free, but the
-- rest of the already-verified transition_item()/RLS/frontend stack all
-- speaks 'published', and renaming an enum value touches all of it for
-- no behavioural gain). "Kept by the house · Deposited in the Record" is
-- a rendered string, not stored data — it belongs in the frontend, not
-- the schema.
--
-- Deliberately NOT here:
-- - An automated "create new version" copy function. Corrections are
--   already possible today (create a new item, set previous_version_of,
--   deposit it — each deposit gets its own permanent Record entry, which
--   IS the append-only guarantee) — the automation is a frontend
--   convenience for later, not a schema requirement.
-- - "send a pigeon" contribution intake. Belongs in its own migration
--   once the frontend contact-form pattern (Turnstile, rate limiting)
--   is decided — same T-068 gap already documented for the general
--   contact form.

-- ---------------------------------------------------------------------
-- Core: bilingual fields, provenance, versioning, soft-delete
-- ---------------------------------------------------------------------
alter table publishing.items
  add column title_ne text,
  add column subtitle_ne text,
  add column summary_ne text,
  add column body_ne jsonb,
  add column deposit_ref text unique,
  add column previous_version_of uuid references publishing.items (id) on delete set null,
  add column superseded_by uuid references publishing.items (id) on delete set null,
  add column deleted_at timestamptz;

comment on column publishing.items.deposit_ref is
  'Permanent reference assigned at deposit time (publishing.deposit_item),
  never reused or reassigned. Null for drafts.';
comment on column publishing.items.previous_version_of is
  'Set when this item is a correction/new edition of an earlier deposited
  item (Non-negotiable §3: corrections by addition, never destruction).
  The earlier item is untouched except superseded_by pointing forward.';
comment on column publishing.items.deleted_at is
  'Soft-delete for DRAFTS only (Non-negotiable §3: "drafts are freely
  mutable") — enforced by api.discard_draft, which refuses to touch
  anything already deposited. Deposited items never get this set.';

-- ---------------------------------------------------------------------
-- Append-only enforcement: block content edits on deposited items
-- ---------------------------------------------------------------------
create function publishing.block_deposited_content_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'published'
     and coalesce(current_setting('paz.allow_transition', true), '') <> 'on'
     and (
       new.title is distinct from old.title
       or new.title_ne is distinct from old.title_ne
       or new.subtitle is distinct from old.subtitle
       or new.subtitle_ne is distinct from old.subtitle_ne
       or new.summary is distinct from old.summary
       or new.summary_ne is distinct from old.summary_ne
       or new.body is distinct from old.body
       or new.body_ne is distinct from old.body_ne
       or new.slug is distinct from old.slug
     )
  then
    raise exception
      'Deposited items are append-only: content cannot be edited once published. Create a new version instead (previous_version_of).'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
comment on function publishing.block_deposited_content_edit() is
  'Non-negotiable §3: deposited content is never silently edited. Status
  transitions (which the app makes under the paz.allow_transition flag,
  see block_direct_status_change in migration 0008) and non-content
  fields (tags, featured_media) remain editable throughout.';

create trigger items_block_deposited_content_edit
  before update on publishing.items
  for each row execute function publishing.block_deposited_content_edit();

-- ---------------------------------------------------------------------
-- Numbering sequences (per-series, staff-visible, permanent)
-- ---------------------------------------------------------------------
create sequence publishing.paper_no_seq start 1;
create sequence publishing.brief_no_seq start 1;
create sequence publishing.dispatch_no_seq start 1;
create sequence publishing.pigeon_post_no_seq start 1;
create sequence publishing.deposit_seq start 1;

create function publishing.next_deposit_ref()
returns text
language sql
as $$
  select 'PAZ-DEP-' || lpad(nextval('publishing.deposit_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------
-- Per-series extension tables (D-6, filled in for real)
-- ---------------------------------------------------------------------
create table publishing.paper_details (
  item_id       uuid primary key references publishing.items (id) on delete restrict,
  paper_no      int not null unique default nextval('publishing.paper_no_seq'),
  abstract      text,
  pdf_media     uuid references publishing.media (id) on delete set null,
  license       text not null check (license in ('CC BY', 'CC BY-SA')),
  sources_note  text
);
comment on table publishing.paper_details is
  'Byline on the public page is always "A Paz Paper" (Non-negotiable/§2 —
  never the individual author). Never dated on the page: the date lives
  in the deposit record (record_entries.deposited_at), not here.';

create table publishing.brief_details (
  item_id   uuid primary key references publishing.items (id) on delete restrict,
  issue_no  int not null unique default nextval('publishing.brief_no_seq'),
  issue_date date not null default current_date
);

create table publishing.dispatch_details (
  item_id    uuid primary key references publishing.items (id) on delete restrict,
  issue_no   int not null unique default nextval('publishing.dispatch_no_seq'),
  issue_date date not null default current_date
);

create table publishing.pigeon_post_details (
  item_id   uuid primary key references publishing.items (id) on delete restrict,
  edition_no text not null unique,
  pdf_media  uuid references publishing.media (id) on delete set null
);
comment on table publishing.pigeon_post_details is
  'Deliberately no author/contributor column anywhere in this table, and
  none may be added — Non-negotiable §3/CMS §5: Pigeon Post is anonymous
  on the page, and contributor identity is not stored in this database
  at all (it lives in the physical Record if anywhere). edition_no is
  staff-entered text ("PP-0000" style) rather than a formatted sequence,
  matching the keepsake''s own numbering convention.';

create table publishing.annual_details (
  item_id   uuid primary key references publishing.items (id) on delete restrict,
  year      int not null unique,
  contents  text,
  pdf_media uuid references publishing.media (id) on delete set null
);

create table publishing.event_details (
  item_id    uuid primary key references publishing.items (id) on delete restrict,
  event_date timestamptz not null,
  location   text
);
comment on table publishing.event_details is
  'Non-negotiable §2 "Events (light)": public events only. Deliberately
  no attendee/registration table here — that is the separate `programs`
  domain''s concern for internal operations, not this public-facing
  listing.';

alter table publishing.paper_details enable row level security;
alter table publishing.brief_details enable row level security;
alter table publishing.dispatch_details enable row level security;
alter table publishing.pigeon_post_details enable row level security;
alter table publishing.annual_details enable row level security;
alter table publishing.event_details enable row level security;

grant select on publishing.paper_details, publishing.brief_details,
  publishing.dispatch_details, publishing.pigeon_post_details,
  publishing.annual_details, publishing.event_details
  to anon, authenticated;
grant insert, update on publishing.paper_details, publishing.brief_details,
  publishing.dispatch_details, publishing.pigeon_post_details,
  publishing.annual_details, publishing.event_details
  to authenticated;

-- Same read rule as items itself: public sees details only for a
-- published parent; staff with item.read see everything.
create policy paper_details_select_published on publishing.paper_details
  for select to anon, authenticated
  using (exists (select 1 from publishing.items i where i.id = item_id and i.status = 'published'));
create policy paper_details_select_staff on publishing.paper_details
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy paper_details_manage_staff on publishing.paper_details
  for all to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')))
  with check ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')));

create policy brief_details_select_published on publishing.brief_details
  for select to anon, authenticated
  using (exists (select 1 from publishing.items i where i.id = item_id and i.status = 'published'));
create policy brief_details_select_staff on publishing.brief_details
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy brief_details_manage_staff on publishing.brief_details
  for all to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')))
  with check ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')));

create policy dispatch_details_select_published on publishing.dispatch_details
  for select to anon, authenticated
  using (exists (select 1 from publishing.items i where i.id = item_id and i.status = 'published'));
create policy dispatch_details_select_staff on publishing.dispatch_details
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy dispatch_details_manage_staff on publishing.dispatch_details
  for all to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')))
  with check ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')));

create policy pigeon_post_details_select_published on publishing.pigeon_post_details
  for select to anon, authenticated
  using (exists (select 1 from publishing.items i where i.id = item_id and i.status = 'published'));
create policy pigeon_post_details_select_staff on publishing.pigeon_post_details
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy pigeon_post_details_manage_staff on publishing.pigeon_post_details
  for all to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')))
  with check ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')));

create policy annual_details_select_published on publishing.annual_details
  for select to anon, authenticated
  using (exists (select 1 from publishing.items i where i.id = item_id and i.status = 'published'));
create policy annual_details_select_staff on publishing.annual_details
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy annual_details_manage_staff on publishing.annual_details
  for all to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')))
  with check ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')));

create policy event_details_select_published on publishing.event_details
  for select to anon, authenticated
  using (exists (select 1 from publishing.items i where i.id = item_id and i.status = 'published'));
create policy event_details_select_staff on publishing.event_details
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy event_details_manage_staff on publishing.event_details
  for all to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')))
  with check ((select authz.has_staff_permission('publishing.item.update')) or (select authz.has_staff_permission('publishing.item.create')));

-- ---------------------------------------------------------------------
-- publishing.record_entries — the public deposit index (append-only)
-- ---------------------------------------------------------------------
create table publishing.record_entries (
  id             uuid primary key default gen_random_uuid(),
  deposit_number text not null unique,
  deposited_at   timestamptz not null default now(),
  item_id        uuid not null references publishing.items (id) on delete restrict,
  entry_type     publishing.item_type not null,
  title          text not null,
  provenance     text not null,
  link           text not null
);
comment on table publishing.record_entries is
  'Non-negotiable §3/§59: the spine of the site. Append-only log of every
  public deposit event, ever — including corrections, which get their
  own new entry rather than editing the original (each deposit_number is
  permanent). Written only by publishing.deposit_item(); no update/delete
  grant to anyone, staff included.';

create index record_entries_deposited_idx on publishing.record_entries (deposited_at desc);
create index record_entries_item_idx on publishing.record_entries (item_id);

alter table publishing.record_entries enable row level security;
grant select on publishing.record_entries to anon, authenticated;
-- No insert/update/delete grant to anyone: written only by the
-- security-definer deposit_item() function below.

create policy record_entries_select_all on publishing.record_entries
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- publishing.deposit_item(item) — the one path onto the Record
-- ---------------------------------------------------------------------
create function publishing.deposit_item(p_item uuid)
returns publishing.items
language plpgsql
security definer
set search_path = publishing, authz, admin, pg_temp
as $$
declare
  v_item publishing.items;
  v_ref text;
  v_deposit_number text;
begin
  select * into v_item from publishing.items where id = p_item for update;
  if not found then
    raise exception 'Item % does not exist', p_item;
  end if;

  v_ref := publishing.next_deposit_ref();
  v_deposit_number := v_ref;

  update publishing.items set deposit_ref = v_ref where id = p_item;

  -- Reuses the existing, already-verified state machine (permission
  -- check per edge, transition revision snapshot, audit row) rather
  -- than duplicating any of that here.
  v_item := publishing.transition_item(p_item, 'published');

  insert into publishing.record_entries
    (deposit_number, item_id, entry_type, title, provenance, link)
  values (
    v_deposit_number,
    v_item.id,
    v_item.type,
    v_item.title,
    'Kept by the house · Deposited in the Record',
    '/' || v_item.type::text || '/' || v_item.slug
  );

  return v_item;
end;
$$;
comment on function publishing.deposit_item(uuid) is
  'The only way an item becomes deposited: assigns the permanent
  deposit_ref, publishes it via the existing state machine, and writes
  its Record entry, all in one transaction. publishing.transition_item
  already enforces the publish permission for the caller.';

revoke all on function publishing.deposit_item(uuid) from public, anon;
grant execute on function publishing.deposit_item(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Draft soft-delete (drafts only — Non-negotiable §3)
-- ---------------------------------------------------------------------
create function publishing.discard_draft(p_item uuid)
returns void
language plpgsql
security invoker
set search_path = publishing, pg_temp
as $$
begin
  update publishing.items
  set deleted_at = now()
  where id = p_item and status = 'draft';
  if not found then
    raise exception 'Only drafts can be discarded — this item is not a draft (or does not exist / is not yours to edit)';
  end if;
end;
$$;

revoke all on function publishing.discard_draft(uuid) from public, anon;
grant execute on function publishing.discard_draft(uuid) to authenticated;

-- Discarded drafts stop showing up anywhere by default. Postgres ORs
-- multiple permissive SELECT policies together, so a *new*, stricter
-- policy alongside the existing items_select_staff (0008) would do
-- nothing — the laxer one would still expose deleted_at rows. The
-- deleted_at filter has to go into items_select_staff itself.
drop policy items_select_staff on publishing.items;
create policy items_select_staff on publishing.items
  for select to authenticated
  using (deleted_at is null and (select authz.has_staff_permission('publishing.item.read')));

-- items_select_own is untouched: an author can still see their own
-- discarded draft (e.g. to confirm the discard succeeded). The frontend
-- draft list is responsible for filtering deleted_at is null when
-- listing active drafts, same as it already filters on status.
