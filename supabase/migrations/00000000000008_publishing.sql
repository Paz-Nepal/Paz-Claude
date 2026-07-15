-- 0008_publishing.sql
--
-- The publishing domain: media, the unified content core (items), revisions,
-- tags, the DB-enforced workflow state machine, RLS, the storage bucket, and
-- the api surface for both the editorial desk and the public website
-- (Architecture Blueprint §4; Build Readiness Review D-6..D-9, §3.2-§3.5).
--
-- Deliberately NOT here (each is absent, not stubbed, per the "no
-- placeholder architecture" rule): type-extension tables (paper_details
-- etc., D-6 — they arrive with the first real Paper workflow), redirects +
-- slug-change trigger (T-049 — arrives with the prerender pipeline),
-- scheduled publishing (T-061 — needs the job runner decision from T-006),
-- and the ingest-media Edge Function's re-encode/EXIF hardening (T-041 —
-- uploads currently go straight to storage under RLS; hardening lands with
-- the Edge Function).

-- ---------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------
-- Postgres enums: values are added only in a dedicated migration with no
-- other statements (Build Readiness Review §3.6). Creation with the initial
-- value set is safe here.
create type publishing.item_type as enum
  ('article', 'page', 'paper', 'dispatch', 'pigeon_post');

create type publishing.item_status as enum
  ('draft', 'in_review', 'published', 'archived');

-- ---------------------------------------------------------------------
-- publishing.media
-- ---------------------------------------------------------------------
create table publishing.media (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique,   -- object path inside the 'media' bucket
  mime_type     text not null,
  size_bytes    bigint,
  width         int,
  height        int,
  alt           text,
  credit        text,
  created_by    uuid not null references identity.people (id) on delete restrict,
  created_at    timestamptz not null default now()
);
comment on table publishing.media is
  'Metadata for objects in the public ''media'' storage bucket. Media never '
  'auto-deletes (D-8): deletion is manual, editor-permission-gated, and '
  'blocked by the on delete restrict FK from items.featured_media. Only '
  'public-website assets belong here -- anything private (member documents, '
  'etc.) gets its own bucket and table when that domain is built.';

create index media_created_at_idx on publishing.media (created_at desc);

alter table publishing.media enable row level security;
grant select, insert, update on publishing.media to authenticated;
grant select on publishing.media to anon;
-- No delete grant: media removal is a later, editor-gated operation with an
-- orphan-check (D-8); until that ships, rows are permanent.

-- The bucket is public and serves published content; its metadata (path,
-- alt text, credit, dimensions) is not sensitive. Anon read keeps the
-- security_invoker api views joinable by the public site.
create policy media_select_all on publishing.media
  for select
  to anon, authenticated
  using (true);

create policy media_insert_staff on publishing.media
  for insert
  to authenticated
  with check (
    created_by = (select authz.current_person_id())
    and (select authz.has_staff_permission('publishing.media.create'))
  );

create policy media_update_manage on publishing.media
  for update
  to authenticated
  using ((select authz.has_staff_permission('publishing.media.manage')))
  with check ((select authz.has_staff_permission('publishing.media.manage')));

-- ---------------------------------------------------------------------
-- publishing.items — the unified content core
-- ---------------------------------------------------------------------
create table publishing.items (
  id                  uuid primary key default gen_random_uuid(),
  type                publishing.item_type not null,
  status              publishing.item_status not null default 'draft',
  slug                text not null,
  title               text not null,
  subtitle            text,
  summary             text,
  body                jsonb not null default '{"type": "doc", "content": []}'::jsonb,
  -- Required change #6 from the Build Readiness Review: without this, the
  -- "re-render every published item in 2060" promise is unenforceable.
  body_schema_version int not null default 1,
  featured_media      uuid references publishing.media (id) on delete restrict,
  author              uuid not null references identity.people (id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz,
  archived_at         timestamptz,

  constraint items_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unique (type, slug)
);
comment on table publishing.items is
  'Every piece of published content -- articles, pages, PAZ Papers, '
  'Dispatch, Pigeon Post -- shares this core (Architecture Blueprint §4.1). '
  'Status changes only through publishing.transition_item(); direct status '
  'updates are blocked by trigger. Items are archived, never deleted.';
comment on column publishing.items.body is
  'ProseMirror document JSON, frozen v1 node set (D-7): doc, paragraph, '
  'heading(2-4), blockquote, bullet_list, ordered_list, list_item, '
  'horizontal_rule; marks: strong, em, link. Any new node type requires a '
  'body_schema_version bump and a renderer that supports all prior '
  'versions forever.';

-- Index set per Build Readiness Review §3.3.
create index items_status_type_published_idx
  on publishing.items (status, type, published_at desc);
create index items_author_idx on publishing.items (author);

create trigger items_set_updated_at
  before update on publishing.items
  for each row execute function public.set_updated_at();

-- Full-text search (D-9): generated tsvector over title/subtitle/summary +
-- a body-text extraction over the ProseMirror JSON.
create function publishing.body_text(p_body jsonb)
returns text
language sql
immutable
as $$
  select coalesce(string_agg(t #>> '{}', ' '), '')
  from jsonb_array_elements(jsonb_path_query_array(p_body, 'strict $.**.text')) as t;
$$;
comment on function publishing.body_text(jsonb) is
  'Collects every text leaf of a ProseMirror JSON document, in document '
  'order, for FTS indexing. Immutable so it can back a generated column.';

alter table publishing.items add column search_tsv tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' '
        || coalesce(summary, '') || ' ' || publishing.body_text(body)
    )
  ) stored;

create index items_search_idx on publishing.items using gin (search_tsv);

-- Status is the state machine's private property: block direct changes so
-- every transition goes through transition_item() (permission per edge,
-- audit row, revision snapshot). The function sets a transaction-local flag
-- before its own update.
create function publishing.block_direct_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('paz.allow_transition', true), '') <> 'on' then
    raise exception
      'Item status changes must go through publishing.transition_item()';
  end if;
  return new;
end;
$$;

create trigger items_block_direct_status_change
  before update on publishing.items
  for each row execute function publishing.block_direct_status_change();

-- ---------------------------------------------------------------------
-- RLS: the public reads published; authors own their drafts; editors all
-- ---------------------------------------------------------------------
alter table publishing.items enable row level security;
grant select on publishing.items to anon, authenticated;
grant insert, update on publishing.items to authenticated;
-- No delete grant for anyone: aggregates are archived, never row-deleted
-- once they exist (Build Readiness Review §3.2).

create policy items_select_published on publishing.items
  for select
  to anon, authenticated
  using (status = 'published');

create policy items_select_own on publishing.items
  for select
  to authenticated
  using (
    author = (select authz.current_person_id())
    and (select authz.has_staff_permission('publishing.item.create'))
  );

create policy items_select_staff on publishing.items
  for select
  to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));

create policy items_insert_author on publishing.items
  for insert
  to authenticated
  with check (
    author = (select authz.current_person_id())
    and status = 'draft'
    and (select authz.has_staff_permission('publishing.item.create'))
  );

-- Authors may edit their own items while still drafts; in_review and beyond
-- belongs to editors (send-back returns it to draft for further edits).
create policy items_update_own_draft on publishing.items
  for update
  to authenticated
  using (
    author = (select authz.current_person_id())
    and status = 'draft'
    and (select authz.has_staff_permission('publishing.item.create'))
  )
  with check (author = (select authz.current_person_id()));

create policy items_update_staff on publishing.items
  for update
  to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')))
  with check ((select authz.has_staff_permission('publishing.item.update')));

-- ---------------------------------------------------------------------
-- publishing.item_revisions — content history
-- ---------------------------------------------------------------------
-- Autosave coalescing (kind = 'autosave', Build Readiness Review §3.5)
-- arrives with the autosave feature itself; today every save is 'manual'
-- and every workflow transition snapshots as 'transition'.
create table publishing.item_revisions (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references publishing.items (id) on delete restrict,
  revision_no         int not null,
  kind                text not null check (kind in ('manual', 'transition')),
  title               text not null,
  body                jsonb not null,
  body_schema_version int not null,
  created_by          uuid references identity.people (id) on delete restrict,
  created_at          timestamptz not null default now(),
  unique (item_id, revision_no)
);
comment on table publishing.item_revisions is
  'Full-content history, written automatically by trigger on every content '
  'change and by transition_item() on every workflow transition. Distinct '
  'from admin.audit_log, which records who/when/what-changed, not content.';

create index item_revisions_item_idx
  on publishing.item_revisions (item_id, revision_no desc);

alter table publishing.item_revisions enable row level security;
grant select on publishing.item_revisions to authenticated;
-- No DML grants: revisions are written only by the security-definer trigger
-- function below and by transition_item(); they are never edited or deleted.

create policy item_revisions_select_own on publishing.item_revisions
  for select
  to authenticated
  using (
    exists (
      select 1 from publishing.items i
      where i.id = item_id
        and i.author = (select authz.current_person_id())
    )
    and (select authz.has_staff_permission('publishing.item.create'))
  );

create policy item_revisions_select_staff on publishing.item_revisions
  for select
  to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));

-- Revision capture: security definer so the write succeeds regardless of
-- which (RLS-permitted) role performed the item update.
create function publishing.capture_revision()
returns trigger
language plpgsql
security definer
set search_path = publishing, authz, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and new.title = old.title
     and new.body = old.body
     and new.body_schema_version = old.body_schema_version then
    return new; -- metadata-only change (status, slug, summary): no snapshot
  end if;

  insert into publishing.item_revisions
    (item_id, revision_no, kind, title, body, body_schema_version, created_by)
  values (
    new.id,
    coalesce(
      (select max(revision_no) from publishing.item_revisions r where r.item_id = new.id),
      0
    ) + 1,
    'manual',
    new.title,
    new.body,
    new.body_schema_version,
    authz.current_person_id()
  );
  return new;
end;
$$;

create trigger items_capture_revision
  after insert or update on publishing.items
  for each row execute function publishing.capture_revision();

-- ---------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------
create table publishing.tags (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
);

create table publishing.item_tags (
  item_id uuid not null references publishing.items (id) on delete cascade,
  tag_id  uuid not null references publishing.tags (id) on delete cascade,
  primary key (item_id, tag_id)
);
create index item_tags_tag_idx on publishing.item_tags (tag_id, item_id);

alter table publishing.tags enable row level security;
alter table publishing.item_tags enable row level security;
grant select on publishing.tags, publishing.item_tags to anon, authenticated;
-- Writes happen only through api.set_item_tags() (security definer, checks
-- the caller may edit the item); no direct DML grants.

create policy tags_select_all on publishing.tags
  for select to anon, authenticated using (true);

create policy item_tags_select_all on publishing.item_tags
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- The state machine
-- ---------------------------------------------------------------------
create function publishing.transition_item(
  p_item uuid,
  p_to publishing.item_status
)
returns publishing.items
language plpgsql
security definer
set search_path = publishing, authz, admin, public, pg_temp
as $$
declare
  v_item publishing.items;
  v_actor uuid;
  v_from publishing.item_status;
begin
  v_actor := authz.current_person_id();
  if v_actor is null then
    raise exception 'Not signed in';
  end if;

  select * into v_item from publishing.items where id = p_item for update;
  if not found then
    raise exception 'Item % does not exist', p_item;
  end if;
  v_from := v_item.status;

  -- Legal edges, each with its own permission (Blueprint §4.2; pgTAP
  -- covers every legal and illegal edge in tests/publishing/).
  if v_from = 'draft' and p_to = 'in_review' then
    if not (
      (v_item.author = v_actor and authz.has_staff_permission('publishing.item.create'))
      or authz.has_staff_permission('publishing.item.update')
    ) then
      raise exception 'Not permitted to submit this item for review';
    end if;
  elsif v_from = 'in_review' and p_to = 'draft' then
    if not authz.has_staff_permission('publishing.item.update') then
      raise exception 'Not permitted to send this item back to draft';
    end if;
  elsif v_from in ('draft', 'in_review') and p_to = 'published' then
    if not authz.has_staff_permission('publishing.item.publish') then
      raise exception 'Not permitted to publish';
    end if;
  elsif v_from = 'published' and p_to = 'archived' then
    if not authz.has_staff_permission('publishing.item.archive') then
      raise exception 'Not permitted to archive';
    end if;
  elsif v_from = 'archived' and p_to = 'published' then
    if not authz.has_staff_permission('publishing.item.publish') then
      raise exception 'Not permitted to restore to published';
    end if;
  else
    raise exception 'Illegal transition: % -> %', v_from, p_to;
  end if;

  perform set_config('paz.allow_transition', 'on', true);
  update publishing.items
  set
    status = p_to,
    published_at = case
      when p_to = 'published' and published_at is null then now()
      else published_at
    end,
    archived_at = case when p_to = 'archived' then now() else null end
  where id = p_item
  returning * into v_item;
  perform set_config('paz.allow_transition', '', true);

  insert into publishing.item_revisions
    (item_id, revision_no, kind, title, body, body_schema_version, created_by)
  values (
    v_item.id,
    coalesce(
      (select max(revision_no) from publishing.item_revisions r where r.item_id = v_item.id),
      0
    ) + 1,
    'transition',
    v_item.title,
    v_item.body,
    v_item.body_schema_version,
    v_actor
  );

  insert into admin.audit_log
    (actor, action, entity_schema, entity_table, entity_id, before, after)
  values (
    v_actor,
    'publishing.item.transition',
    'publishing', 'items', p_item,
    jsonb_build_object('status', v_from),
    jsonb_build_object('status', p_to)
  );

  return v_item;
end;
$$;
comment on function publishing.transition_item is
  'THE way item status changes. Row-locks the target, checks the permission '
  'for the specific edge, snapshots a transition revision, writes audit. '
  'security definer + self-checked permissions; direct status updates are '
  'blocked by trigger.';

revoke all on function publishing.transition_item from public, anon;
grant execute on function publishing.transition_item to authenticated;

-- ---------------------------------------------------------------------
-- Storage: the public 'media' bucket + object policies
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy media_objects_insert_staff on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (select authz.has_staff_permission('publishing.media.create'))
  );

create policy media_objects_select_all on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

-- No update/delete policies: objects in 'media' are immutable once
-- uploaded; removal is a manual, editor-gated operation that arrives with
-- the orphan-report tooling (D-8).

-- ---------------------------------------------------------------------
-- Shared display-name helper (used inside security_invoker api views so a
-- byline/desk row can carry a human name without granting broad person-read)
-- ---------------------------------------------------------------------
create function identity.display_name(p_person uuid)
returns text
language sql
stable
security definer
set search_path = identity, pg_temp
as $$
  select coalesce(display_name, full_name)
  from identity.people
  where id = identity.canonical_person(p_person);
$$;
comment on function identity.display_name(uuid) is
  'Returns only the display name for a person id. security definer so '
  'bylines and desk rows work without granting person-read; exposes '
  'nothing beyond the name, and published bylines are public record anyway '
  '(erased people already read "Erased Person" via the erasure spec).';

revoke all on function identity.display_name(uuid) from public;
grant execute on function identity.display_name(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------

-- Public: list of published items (no body -- lists never need it).
create view api.published_items
with (security_invoker = true)
as
select
  i.id,
  i.type,
  i.slug,
  i.title,
  i.subtitle,
  i.summary,
  i.published_at,
  identity.display_name(i.author) as author_name,
  m.storage_path as featured_media_path,
  m.alt as featured_media_alt
from publishing.items i
left join publishing.media m on m.id = i.featured_media
where i.status = 'published';
comment on view api.published_items is
  'The public content surface. security_invoker: publishing.items'' own '
  'published-only RLS policy is what authorizes each row. Versioned per '
  'ADR-32: breaking shape changes require api.published_items_v2.';

grant select on api.published_items to anon, authenticated;

-- Public: a single published item with its body, for content pages.
create function api.get_published_item(p_type publishing.item_type, p_slug text)
returns table (
  id uuid,
  type publishing.item_type,
  slug text,
  title text,
  subtitle text,
  summary text,
  body jsonb,
  body_schema_version int,
  published_at timestamptz,
  author_name text,
  featured_media_path text,
  featured_media_alt text,
  tags text[]
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select
    i.id, i.type, i.slug, i.title, i.subtitle, i.summary,
    i.body, i.body_schema_version, i.published_at,
    identity.display_name(i.author),
    m.storage_path, m.alt,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it
       join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    )
  from publishing.items i
  left join publishing.media m on m.id = i.featured_media
  where i.type = p_type and i.slug = p_slug and i.status = 'published';
$$;

grant execute on function api.get_published_item to anon, authenticated;

-- Public: full-text search over published items (D-9).
create function api.search_published(q text)
returns setof api.published_items
language sql
stable
security invoker
set search_path = publishing, api, pg_temp
as $$
  select p.* from api.published_items p
  join publishing.items i on i.id = p.id
  where i.search_tsv @@ plainto_tsquery('english', q);
$$;

grant execute on function api.search_published to anon, authenticated;

-- Public: whitelisted institutional settings for the site chrome.
create function api.site_info()
returns jsonb
language sql
stable
security definer
set search_path = admin, pg_temp
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from admin.settings
  where key in ('site.name', 'site.tagline', 'site.contact_email');
$$;
comment on function api.site_info() is
  'security definer with a hard-coded whitelist: exactly these three keys '
  'are public. Everything else in admin.settings stays staff-only.';

revoke all on function api.site_info() from public;
grant execute on function api.site_info() to anon, authenticated;

-- Staff: the caller's own permission keys, for frontend UI gating. RLS
-- never trusts this -- it exists so nav/route gating works even when the
-- JWT claims hook (0007) is not enabled on the Auth server.
create function api.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = authz, pg_temp
as $$
  select coalesce(array_agg(distinct rp.permission_key), '{}')
  from authz.user_roles ur
  join authz.role_permissions rp on rp.role_key = ur.role_key
  where ur.person_id = authz.current_person_id()
    and (ur.expires_at is null or ur.expires_at > now());
$$;

revoke all on function api.my_permissions() from public, anon;
grant execute on function api.my_permissions() to authenticated;

-- Staff: the editorial desk list. security_invoker -- authors see their own
-- items, editors see everything, exactly per the table's RLS.
create view api.desk_items
with (security_invoker = true)
as
select
  i.id,
  i.type,
  i.status,
  i.slug,
  i.title,
  identity.display_name(i.author) as author_name,
  i.author,
  i.updated_at,
  i.published_at
from publishing.items i;
comment on view api.desk_items is
  'Editorial desk listing. security_invoker; the published-only policy '
  'also technically admits anon-shaped queries, but the view is granted to '
  'authenticated only.';

grant select on api.desk_items to authenticated;

-- Staff: one item with body, for the editor.
create function api.get_item(p_id uuid)
returns table (
  id uuid,
  type publishing.item_type,
  status publishing.item_status,
  slug text,
  title text,
  subtitle text,
  summary text,
  body jsonb,
  body_schema_version int,
  featured_media uuid,
  featured_media_path text,
  author uuid,
  author_name text,
  updated_at timestamptz,
  published_at timestamptz,
  tags text[]
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select
    i.id, i.type, i.status, i.slug, i.title, i.subtitle, i.summary,
    i.body, i.body_schema_version, i.featured_media, m.storage_path,
    i.author, identity.display_name(i.author), i.updated_at, i.published_at,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it
       join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    )
  from publishing.items i
  left join publishing.media m on m.id = i.featured_media
  where i.id = p_id;
$$;

revoke all on function api.get_item from public, anon;
grant execute on function api.get_item to authenticated;

-- Staff: create or update an item. security invoker -- the table's RLS
-- (authors own drafts / editors all) is what authorizes the write.
create function api.save_item(
  p_id uuid,
  p_type publishing.item_type,
  p_slug text,
  p_title text,
  p_subtitle text,
  p_summary text,
  p_body jsonb,
  p_featured_media uuid
)
returns uuid
language plpgsql
security invoker
set search_path = publishing, authz, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into publishing.items
      (type, slug, title, subtitle, summary, body, featured_media, author)
    values (
      p_type, p_slug, p_title, p_subtitle, p_summary,
      coalesce(p_body, '{"type": "doc", "content": []}'::jsonb),
      p_featured_media,
      (select authz.current_person_id())
    )
    returning id into v_id;
  else
    update publishing.items
    set
      slug = p_slug,
      title = p_title,
      subtitle = p_subtitle,
      summary = p_summary,
      body = coalesce(p_body, body),
      featured_media = p_featured_media
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Item not found or not editable by you'
        using errcode = '42501';
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_item from public, anon;
grant execute on function api.save_item to authenticated;

-- Staff: workflow transition, thin wrapper over the state machine.
create function api.transition_item(p_id uuid, p_to publishing.item_status)
returns publishing.item_status
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select (publishing.transition_item(p_id, p_to)).status;
$$;

revoke all on function api.transition_item from public, anon;
grant execute on function api.transition_item to authenticated;

-- Staff: replace an item's tag set. security definer (tags have no direct
-- DML grants); checks the caller can actually edit the item first.
create function api.set_item_tags(p_item uuid, p_tags text[])
returns void
language plpgsql
security definer
set search_path = publishing, authz, pg_temp
as $$
declare
  v_actor uuid := authz.current_person_id();
  v_tag text;
  v_slug text;
  v_can_edit boolean;
begin
  select
    (i.author = v_actor and authz.has_staff_permission('publishing.item.create'))
    or authz.has_staff_permission('publishing.item.update')
  into v_can_edit
  from publishing.items i
  where i.id = p_item;

  if not coalesce(v_can_edit, false) then
    raise exception 'Not permitted to edit this item''s tags'
      using errcode = '42501';
  end if;

  delete from publishing.item_tags where item_id = p_item;

  foreach v_tag in array coalesce(p_tags, '{}') loop
    v_tag := btrim(v_tag);
    continue when v_tag = '';
    v_slug := regexp_replace(lower(v_tag), '[^a-z0-9]+', '-', 'g');
    v_slug := btrim(v_slug, '-');
    continue when v_slug = '';

    insert into publishing.tags (slug, name)
    values (v_slug, v_tag)
    on conflict (slug) do nothing;

    insert into publishing.item_tags (item_id, tag_id)
    select p_item, id from publishing.tags where slug = v_slug
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function api.set_item_tags from public, anon;
grant execute on function api.set_item_tags to authenticated;

-- Staff: media library listing + registration.
create view api.media_library
with (security_invoker = true)
as
select id, storage_path, mime_type, size_bytes, width, height, alt, credit, created_at
from publishing.media;

grant select on api.media_library to authenticated;

create function api.register_media(
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_width int,
  p_height int,
  p_alt text,
  p_credit text
)
returns uuid
language sql
volatile
security invoker
set search_path = publishing, authz, pg_temp
as $$
  insert into publishing.media
    (storage_path, mime_type, size_bytes, width, height, alt, credit, created_by)
  values (
    p_storage_path, p_mime_type, p_size_bytes, p_width, p_height, p_alt,
    p_credit, (select authz.current_person_id())
  )
  returning id;
$$;

revoke all on function api.register_media from public, anon;
grant execute on function api.register_media to authenticated;

-- Staff: settings surface for the admin console.
create view api.settings
with (security_invoker = true)
as
select key, value, description, updated_at from admin.settings;

grant select on api.settings to authenticated;

create function api.update_setting(p_key text, p_value jsonb)
returns void
language sql
volatile
security invoker
set search_path = admin, authz, pg_temp
as $$
  insert into admin.settings (key, value, updated_by)
  values (p_key, p_value, (select authz.current_person_id()))
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by;
$$;

revoke all on function api.update_setting from public, anon;
grant execute on function api.update_setting to authenticated;

-- ---------------------------------------------------------------------
-- Setting defaults (idempotent; keys mirror @paz/types SettingsRegistry)
-- ---------------------------------------------------------------------
insert into admin.settings (key, value, description) values
  ('site.name', '"PAZ"', 'Public site name, shown in the header and titles.'),
  ('site.tagline', '"A hospitality-led cultural institution in Kathmandu."', 'One-line description under the site name.'),
  ('site.contact_email', '"hello@pazpatan.com"', 'Public contact address shown in the footer.')
on conflict (key) do nothing;
