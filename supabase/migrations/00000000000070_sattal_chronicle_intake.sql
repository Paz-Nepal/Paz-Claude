-- 0070_sattal_chronicle_intake.sql
--
-- PAZ Site Build Specification sections 4.10, 7, 9, 10, 12:
--   * canonical deposit addresses and an append-only redirect table
--   * the Sattal (signed work by independent authors) with the conflict
--     rule enforced in the database, not only in the form
--   * the Chronicle (a run of dated one-line acts)
--   * the private voice intake and the enquiry path
--   * the glossary
--
-- The archive wall is absolute: nothing here puts a giver, a recording,
-- a consent state or a catalogue number in any public surface. The voice
-- intake is readable only by authenticated staff holding crm.voice.read.

-- ---------------------------------------------------------------------
-- 1. The Record: entries may now come from a Sattal piece, and the
--    canonical address of a deposit is its number (4.10).
-- ---------------------------------------------------------------------
alter table publishing.record_entries alter column item_id drop not null;
alter table publishing.record_entries add column sattal_piece_id uuid;
alter table publishing.record_entries add column readable_path text;
alter table publishing.record_entries
  add constraint record_entries_has_source check (item_id is not null or sattal_piece_id is not null);

comment on column publishing.record_entries.link is
  'The canonical address of the deposit: /record/<deposit_number>. The '
  'readable slug path is kept in readable_path and redirects here, never '
  'the reverse (Build Specification 4.10).';

-- ---------------------------------------------------------------------
-- 2. Redirects: append-only, never pruned, no published address ever
--    retired. A row is never rewritten (on conflict do nothing) and never
--    deleted.
-- ---------------------------------------------------------------------
create function publishing.block_redirect_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Redirects are append-only: a published address is never retired or rewritten.'
    using errcode = '42501';
end;
$$;
create trigger redirects_append_only
  before update or delete on publishing.redirects
  for each row execute function publishing.block_redirect_change();

create or replace function publishing.record_item_redirect()
returns trigger
language plpgsql
security definer
set search_path = publishing, pg_temp
as $$
declare
  v_target text;
begin
  if old.status = 'published' and (old.slug is distinct from new.slug or old.type is distinct from new.type) then
    v_target := case
      when new.deposit_ref is not null then '/record/' || new.deposit_ref
      else publishing.item_public_path(new.type, new.slug)
    end;
    insert into publishing.redirects (old_path, new_path)
    values (publishing.item_public_path(old.type, old.slug), v_target)
    on conflict (old_path) do nothing;
  end if;
  return new;
end;
$$;

-- deposit_item now makes the deposit number the canonical link and
-- records the readable path as a permanent redirect to it.
create or replace function publishing.deposit_item(p_item uuid)
returns publishing.items
language plpgsql
security definer
set search_path = publishing, authz, admin, pg_temp
as $$
declare
  v_item publishing.items;
  v_ref text;
  v_readable text;
begin
  select * into v_item from publishing.items where id = p_item for update;
  if not found then
    raise exception 'Item % does not exist', p_item;
  end if;

  if v_item.type not in ('paper', 'brief', 'dispatch', 'pigeon_post', 'annual') then
    raise exception 'Only Papers, Briefs, Dispatches, Pigeon Posts, and Annuals are deposited onto the Record. Use publishing.transition_item to publish a %.', v_item.type;
  end if;

  v_ref := publishing.next_deposit_ref();
  update publishing.items set deposit_ref = v_ref where id = p_item;

  v_item := publishing.transition_item(p_item, 'published');
  v_readable := publishing.item_public_path(v_item.type, v_item.slug);

  insert into publishing.record_entries
    (deposit_number, item_id, entry_type, title, provenance, link, readable_path)
  values (
    v_ref, v_item.id, v_item.type, v_item.title,
    'Kept by the house · Deposited in the Record',
    '/record/' || v_ref, v_readable
  );

  insert into publishing.redirects (old_path, new_path)
  values (v_readable, '/record/' || v_ref)
  on conflict (old_path) do nothing;

  return v_item;
end;
$$;

create or replace view api.record_entries
with (security_invoker = true)
as
select id, deposit_number, deposited_at, entry_type, title, provenance, link, readable_path
from publishing.record_entries
order by deposited_at desc;
grant select on api.record_entries to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. The Sattal
-- ---------------------------------------------------------------------
create schema if not exists sattal;
comment on schema sattal is 'The Sattal: signed pieces by independent authors, and their outside readers.';
grant usage on schema sattal to anon, authenticated, service_role;

create sequence sattal.piece_no_seq start 1;

create table sattal.outside_readers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (btrim(name) <> ''),
  note          text,
  appointed_on  date not null default current_date,
  active        boolean not null default true
);

create table sattal.pieces (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Its own sequence, separate from the Papers. Assigned at publication.
  piece_number          int unique,
  form                  text not null check (form in ('study', 'review', 'account')),
  person_id             uuid not null references wall.people (id) on delete restrict,
  title                 text not null check (btrim(title) <> ''),
  title_ne              text,
  -- ProseMirror v1 documents, like every other body. Source keys are
  -- written inline as [[key]] and set out in the margin from `sources`.
  body                  jsonb not null default '{"type": "doc", "content": []}'::jsonb,
  body_ne               jsonb,
  sources               jsonb not null default '[]'::jsonb,
  original_language     text not null check (original_language in ('en', 'ne', 'new')),
  translation_of        uuid references sattal.pieces (id) on delete restrict,
  -- Required at the database level, never empty (7.2).
  relation_declaration  text not null check (btrim(relation_declaration) <> ''),
  subject_work_id       uuid references wall.works (id) on delete restrict,
  subject_person_id     uuid references wall.people (id) on delete restrict,
  about_house           boolean not null default false,
  -- Conservative default: the author is presumed connected until someone
  -- has attested otherwise.
  author_connected      boolean not null default true,
  outside_reader_id     uuid references sattal.outside_readers (id) on delete restrict,
  reader_accepted_on    date,
  reply_to_piece_id     uuid references sattal.pieces (id) on delete restrict,
  status                text not null default 'draft' check (status in ('draft', 'published')),
  deposit_ref           text unique,
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index pieces_person_idx on sattal.pieces (person_id);
create index pieces_subject_person_idx on sattal.pieces (subject_person_id);
create index pieces_subject_work_idx on sattal.pieces (subject_work_id);
create index pieces_reply_idx on sattal.pieces (reply_to_piece_id);
create trigger pieces_set_updated_at
  before update on sattal.pieces
  for each row execute function public.set_updated_at();

-- Corrections are additions: a published piece is never rewritten.
create table sattal.piece_corrections (
  id          uuid primary key default gen_random_uuid(),
  piece_id    uuid not null references sattal.pieces (id) on delete restrict,
  note        text not null check (btrim(note) <> ''),
  added_at    timestamptz not null default now()
);

create function sattal.block_correction_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'A correction is added, never changed.' using errcode = '42501';
end;
$$;
create trigger piece_corrections_append_only
  before update or delete on sattal.piece_corrections
  for each row execute function sattal.block_correction_change();

-- Is this piece about anything the house shows, sells or has formed, or
-- about PAZ itself? (7.2)
create function sattal.is_house_connected(
  p_about_house boolean, p_work uuid, p_person uuid
)
returns boolean
language sql
stable
security definer
set search_path = wall, pg_temp
as $$
  select coalesce(p_about_house, false)
    or p_work is not null
    or (
      p_person is not null and exists (
        select 1 from wall.people p
        where p.id = p_person
          and (
            p.represented or p.formed_by_guild
            or exists (select 1 from wall.works w where w.person_id = p.id)
          )
      )
    );
$$;

create function sattal.enforce_piece_rules()
returns trigger
language plpgsql
security definer
set search_path = sattal, wall, pg_temp
as $$
begin
  -- Published pieces are immutable except for nothing at all.
  if tg_op = 'UPDATE' and old.status = 'published' then
    raise exception 'A published piece is never rewritten. Add a correction instead.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from wall.people p where p.id = new.person_id and 'author' = any (p.roles)) then
    raise exception 'The author of a Sattal piece must be a person with the author role.'
      using errcode = '23514';
  end if;

  if new.status = 'published' then
    if sattal.is_house_connected(new.about_house, new.subject_work_id, new.subject_person_id) then
      if new.outside_reader_id is null
         or not exists (select 1 from sattal.outside_readers r where r.id = new.outside_reader_id and r.active)
      then
        raise exception 'This piece is about work the house shows, sells or has formed, or about PAZ. It can be published only once a named outside reader has accepted it.'
          using errcode = '23514';
      end if;
      if new.reader_accepted_on is null then
        raise exception 'The outside reader''s acceptance has not been recorded.'
          using errcode = '23514';
      end if;
      if new.author_connected then
        raise exception 'The author of this piece is connected to its subject. It cannot be published.'
          using errcode = '23514';
      end if;
    end if;
    if new.reply_to_piece_id is not null
       and not exists (select 1 from sattal.pieces o where o.id = new.reply_to_piece_id and o.status = 'published')
    then
      raise exception 'A reply can only answer a published piece.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger pieces_enforce_rules
  before insert or update on sattal.pieces
  for each row execute function sattal.enforce_piece_rules();

alter table publishing.record_entries
  add constraint record_entries_sattal_fk
  foreign key (sattal_piece_id) references sattal.pieces (id) on delete restrict;

-- RLS
alter table sattal.outside_readers enable row level security;
alter table sattal.pieces enable row level security;
alter table sattal.piece_corrections enable row level security;

grant select on sattal.outside_readers, sattal.pieces, sattal.piece_corrections to anon, authenticated;

create policy readers_select_public on sattal.outside_readers
  for select to anon, authenticated using (true);
create policy pieces_select_public on sattal.pieces
  for select to anon, authenticated using (status = 'published');
create policy pieces_select_staff on sattal.pieces
  for select to authenticated using ((select authz.has_staff_permission('sattal.manage')));
create policy corrections_select_public on sattal.piece_corrections
  for select to anon, authenticated
  using (exists (select 1 from sattal.pieces p where p.id = piece_id and p.status = 'published'));

-- Public views
create view api.sattal_readers with (security_invoker = true) as
select id, name, note, appointed_on from sattal.outside_readers where active order by appointed_on;

create view api.sattal_pieces with (security_invoker = true) as
select
  p.id, p.slug, p.piece_number, p.form,
  a.id as person_id, a.slug as person_slug, a.name as person_name, a.name_ne as person_name_ne,
  p.title, p.title_ne, p.body, p.body_ne, p.sources,
  p.original_language, p.translation_of, p.relation_declaration,
  p.subject_work_id, w.slug as subject_work_slug, w.title as subject_work_title,
  p.subject_person_id, sp.slug as subject_person_slug, sp.name as subject_person_name,
  p.about_house,
  r.name as outside_reader_name, p.reader_accepted_on,
  p.reply_to_piece_id, p.deposit_ref, p.published_at
from sattal.pieces p
join wall.people a on a.id = p.person_id
left join wall.works w on w.id = p.subject_work_id
left join wall.people sp on sp.id = p.subject_person_id
left join sattal.outside_readers r on r.id = p.outside_reader_id
order by p.published_at desc;

create view api.sattal_corrections with (security_invoker = true) as
select id, piece_id, note, added_at from sattal.piece_corrections order by added_at;

create view api.admin_sattal_pieces with (security_invoker = true) as
select p.*, a.name as person_name,
  sattal.is_house_connected(p.about_house, p.subject_work_id, p.subject_person_id) as house_connected
from sattal.pieces p
join wall.people a on a.id = p.person_id
order by p.created_at desc;

grant select on api.sattal_readers, api.sattal_pieces, api.sattal_corrections to anon, authenticated;
grant select on api.admin_sattal_pieces to authenticated;

-- Write functions
create function api.save_outside_reader(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = sattal, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('sattal.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is not null then
    update sattal.outside_readers set
      name = p ->> 'name', note = nullif(p ->> 'note', ''),
      active = coalesce((p ->> 'active')::boolean, active)
    where id = v_id;
  else
    insert into sattal.outside_readers (name, note, active)
    values (p ->> 'name', nullif(p ->> 'note', ''), coalesce((p ->> 'active')::boolean, true))
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'sattal.reader.save', 'sattal', 'outside_readers', v_id, null, p);
  return v_id;
end;
$$;

create function api.save_sattal_piece(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = sattal, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('sattal.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is not null then
    update sattal.pieces set
      slug = p ->> 'slug',
      form = p ->> 'form',
      person_id = (p ->> 'person_id')::uuid,
      title = p ->> 'title',
      title_ne = nullif(p ->> 'title_ne', ''),
      body = coalesce(p -> 'body', body),
      body_ne = case when p ? 'body_ne' then p -> 'body_ne' else body_ne end,
      sources = coalesce(p -> 'sources', sources),
      original_language = p ->> 'original_language',
      translation_of = nullif(p ->> 'translation_of', '')::uuid,
      relation_declaration = coalesce(p ->> 'relation_declaration', ''),
      subject_work_id = nullif(p ->> 'subject_work_id', '')::uuid,
      subject_person_id = nullif(p ->> 'subject_person_id', '')::uuid,
      about_house = coalesce((p ->> 'about_house')::boolean, false),
      author_connected = coalesce((p ->> 'author_connected')::boolean, true),
      outside_reader_id = nullif(p ->> 'outside_reader_id', '')::uuid,
      reader_accepted_on = nullif(p ->> 'reader_accepted_on', '')::date,
      reply_to_piece_id = nullif(p ->> 'reply_to_piece_id', '')::uuid
    where id = v_id;
    if not found then
      raise exception 'Piece % does not exist', v_id;
    end if;
  else
    insert into sattal.pieces (slug, form, person_id, title, title_ne, body, body_ne, sources,
      original_language, translation_of, relation_declaration, subject_work_id, subject_person_id,
      about_house, author_connected, outside_reader_id, reader_accepted_on, reply_to_piece_id)
    values (
      p ->> 'slug', p ->> 'form', (p ->> 'person_id')::uuid, p ->> 'title', nullif(p ->> 'title_ne', ''),
      coalesce(p -> 'body', '{"type": "doc", "content": []}'::jsonb), p -> 'body_ne',
      coalesce(p -> 'sources', '[]'::jsonb), p ->> 'original_language',
      nullif(p ->> 'translation_of', '')::uuid, coalesce(p ->> 'relation_declaration', ''),
      nullif(p ->> 'subject_work_id', '')::uuid, nullif(p ->> 'subject_person_id', '')::uuid,
      coalesce((p ->> 'about_house')::boolean, false), coalesce((p ->> 'author_connected')::boolean, true),
      nullif(p ->> 'outside_reader_id', '')::uuid, nullif(p ->> 'reader_accepted_on', '')::date,
      nullif(p ->> 'reply_to_piece_id', '')::uuid
    )
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'sattal.piece.save', 'sattal', 'pieces', v_id, null,
    jsonb_build_object('slug', p ->> 'slug', 'form', p ->> 'form'));
  return v_id;
end;
$$;

-- Published fast: no schedule, no board. The conflict rule is enforced by
-- the trigger on the row itself, so it cannot be bypassed from here or
-- from anywhere else.
create function api.publish_sattal_piece(p_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = sattal, publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('sattal.manage');
  v_piece sattal.pieces;
  v_ref text;
  v_readable text;
begin
  select * into v_piece from sattal.pieces where id = p_id for update;
  if not found then
    raise exception 'Piece % does not exist', p_id;
  end if;
  if v_piece.status = 'published' then
    raise exception 'This piece is already published.';
  end if;

  v_ref := publishing.next_deposit_ref();
  v_readable := '/sattal/' || v_piece.slug;

  update sattal.pieces set
    status = 'published',
    piece_number = nextval('sattal.piece_no_seq'),
    deposit_ref = v_ref,
    published_at = now()
  where id = p_id;

  insert into publishing.record_entries
    (deposit_number, sattal_piece_id, entry_type, title, provenance, link, readable_path)
  values (
    v_ref, p_id, 'sattal', v_piece.title,
    'Signed piece · Deposited in the Record',
    '/record/' || v_ref, v_readable
  );

  insert into publishing.redirects (old_path, new_path)
  values (v_readable, '/record/' || v_ref)
  on conflict (old_path) do nothing;

  perform wall.audit(v_actor, 'sattal.piece.publish', 'sattal', 'pieces', p_id, null,
    jsonb_build_object('deposit_ref', v_ref));
  return v_ref;
end;
$$;

create function api.add_sattal_correction(p_piece uuid, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path = sattal, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('sattal.manage');
  v_id uuid;
begin
  insert into sattal.piece_corrections (piece_id, note) values (p_piece, p_note)
  returning id into v_id;
  perform wall.audit(v_actor, 'sattal.correction.add', 'sattal', 'piece_corrections', v_id, null,
    jsonb_build_object('piece_id', p_piece));
  return v_id;
end;
$$;

revoke all on function api.save_outside_reader, api.save_sattal_piece, api.publish_sattal_piece,
  api.add_sattal_correction from public, anon;
grant execute on function api.save_outside_reader(jsonb), api.save_sattal_piece(jsonb),
  api.publish_sattal_piece(uuid), api.add_sattal_correction(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. The Chronicle: a run, not articles (9). One dated line for each
--    thing the house did. Append-only; a correction is another line.
-- ---------------------------------------------------------------------
create table publishing.chronicle_lines (
  id          uuid primary key default gen_random_uuid(),
  line_on     date not null,
  line        text not null check (char_length(btrim(line)) between 1 and 280 and line !~ E'[\\n\\r]'),
  corrects_id uuid references publishing.chronicle_lines (id) on delete restrict,
  created_by  uuid references identity.people (id) on delete restrict,
  created_at  timestamptz not null default now()
);
create index chronicle_lines_order_idx on publishing.chronicle_lines (line_on desc, created_at desc);

create function publishing.block_chronicle_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The Chronicle is append-only: a correction is another line.' using errcode = '42501';
end;
$$;
create trigger chronicle_lines_append_only
  before update or delete on publishing.chronicle_lines
  for each row execute function publishing.block_chronicle_change();

alter table publishing.chronicle_lines enable row level security;
grant select on publishing.chronicle_lines to anon, authenticated;
create policy chronicle_select_all on publishing.chronicle_lines
  for select to anon, authenticated using (true);

create view api.chronicle_lines with (security_invoker = true) as
select id, line_on, line, corrects_id
from publishing.chronicle_lines
order by line_on desc, created_at desc;
grant select on api.chronicle_lines to anon, authenticated;

create function api.add_chronicle_line(p_on date, p_line text, p_corrects uuid default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('chronicle.line.create');
  v_id uuid;
begin
  insert into publishing.chronicle_lines (line_on, line, corrects_id, created_by)
  values (p_on, btrim(p_line), p_corrects, v_actor)
  returning id into v_id;
  perform wall.audit(v_actor, 'chronicle.line.add', 'publishing', 'chronicle_lines', v_id, null,
    jsonb_build_object('line_on', p_on));
  return v_id;
end;
$$;
revoke all on function api.add_chronicle_line from public, anon;
grant execute on function api.add_chronicle_line(date, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. The private voice intake (10). Staff-only. No public read of any
--    kind, no list, no index, nothing searchable.
-- ---------------------------------------------------------------------
create table crm.voice_intake (
  id            uuid primary key default gen_random_uuid(),
  submitted_at  timestamptz not null default now(),
  writer_name   text not null check (btrim(writer_name) <> ''),
  contact       text not null check (btrim(contact) <> ''),
  about_name    text,
  place         text,
  note          text
);
alter table crm.voice_intake enable row level security;
grant select on crm.voice_intake to authenticated;
create policy voice_intake_select_staff on crm.voice_intake
  for select to authenticated using ((select authz.has_staff_permission('crm.voice.read')));

create function api.submit_voice_intake(
  p_writer_name text, p_contact text, p_about_name text, p_place text, p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = crm, pg_temp
as $$
declare
  v_id uuid;
begin
  if btrim(coalesce(p_writer_name, '')) = '' or btrim(coalesce(p_contact, '')) = '' then
    raise exception 'A name and a way to reach you are required.';
  end if;
  insert into crm.voice_intake (writer_name, contact, about_name, place, note)
  values (btrim(p_writer_name), btrim(p_contact), nullif(btrim(p_about_name), ''),
    nullif(btrim(p_place), ''), nullif(btrim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function api.submit_voice_intake from public, anon, authenticated;
grant execute on function api.submit_voice_intake(text, text, text, text, text) to service_role;

create view api.voice_intake with (security_invoker = true) as
select id, submitted_at, writer_name, contact, about_name, place, note
from crm.voice_intake
order by submitted_at desc;
grant select on api.voice_intake to authenticated;

-- ---------------------------------------------------------------------
-- 6. Enquiries (12): an enquiry about a work reuses the contact inbox,
--    so the site keeps exactly one dynamic dependency for forms (11.4).
-- ---------------------------------------------------------------------
alter table admin.contact_messages
  add column kind text not null default 'contact' check (kind in ('contact', 'enquiry')),
  add column work_id uuid references wall.works (id) on delete restrict;

drop function api.submit_contact_message(text, text, text);
create function api.submit_contact_message(
  p_full_name text, p_email text, p_message text, p_work_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = admin, wall, pg_temp
as $$
declare
  v_id uuid;
  v_message text := p_message;
  v_title text;
  v_number int;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required';
  end if;
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required';
  end if;
  if p_message is null or btrim(p_message) = '' then
    raise exception 'Message is required';
  end if;

  if p_work_id is not null then
    select w.title, w.work_number into v_title, v_number from wall.works w where w.id = p_work_id;
    if v_title is null then
      raise exception 'That work does not exist';
    end if;
    v_message := 'Enquiry about work no. ' || v_number || ', ' || v_title || E'\n\n' || p_message;
  end if;

  insert into admin.contact_messages (full_name, email, message, kind, work_id)
  values (p_full_name, p_email, v_message,
    case when p_work_id is null then 'contact' else 'enquiry' end, p_work_id)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function api.submit_contact_message from public, anon, authenticated;
grant execute on function api.submit_contact_message(text, text, text, uuid) to service_role;

create or replace view api.contact_messages
with (security_invoker = true)
as
select id, full_name, email, message, submitted_at, reviewed, reviewed_at, kind, work_id
from admin.contact_messages;
grant select on api.contact_messages to authenticated;

-- ---------------------------------------------------------------------
-- 7. The glossary and the spelling list's public face (8, /words)
-- ---------------------------------------------------------------------
create table publishing.glossary_terms (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind           text not null default 'term' check (kind in ('term', 'spelling')),
  term           text not null check (btrim(term) <> ''),
  term_ne        text,
  definition     text not null check (btrim(definition) <> ''),
  definition_ne  text,
  created_at     timestamptz not null default now()
);
alter table publishing.glossary_terms enable row level security;
grant select on publishing.glossary_terms to anon, authenticated;
create policy glossary_select_all on publishing.glossary_terms
  for select to anon, authenticated using (true);

create view api.glossary_terms with (security_invoker = true) as
select id, slug, kind, term, term_ne, definition, definition_ne
from publishing.glossary_terms
order by lower(term);
grant select on api.glossary_terms to anon, authenticated;

create function api.save_glossary_term(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('publishing.item.update');
  v_id uuid;
begin
  insert into publishing.glossary_terms (slug, kind, term, term_ne, definition, definition_ne)
  values (p ->> 'slug', coalesce(nullif(p ->> 'kind', ''), 'term'), p ->> 'term',
    nullif(p ->> 'term_ne', ''), p ->> 'definition', nullif(p ->> 'definition_ne', ''))
  on conflict (slug) do update set
    kind = excluded.kind, term = excluded.term, term_ne = excluded.term_ne,
    definition = excluded.definition, definition_ne = excluded.definition_ne
  returning id into v_id;
  perform wall.audit(v_actor, 'glossary.term.save', 'publishing', 'glossary_terms', v_id, null, p);
  return v_id;
end;
$$;
revoke all on function api.save_glossary_term from public, anon;
grant execute on function api.save_glossary_term(jsonb) to authenticated;
