-- 0076_terms_hands_sattal_admin.sql
--
-- Build Programme 4, 5, 6.3, plus the permissions the rest of the programme
-- needs (77 and 78 use them).
--
--   * the four terms documents, deposited with a version history (item
--     type 'terms', slugs painters | writers | memory | friends, later
--     versions <kind>-v2, <kind>-v3 ...);
--   * the register of hands: every named role and office, who holds it,
--     and which seats are open, each open seat with its own address;
--   * the Sattal completed: commissioning record, author agreement on file,
--     and the rate ledger that separates acceptance from payment.

-- ---------------------------------------------------------------------
-- Permissions for all of section B of the programme.
-- ---------------------------------------------------------------------
insert into authz.permissions (key, description) values
  ('governance.manage', 'Keep the register of hands: roles, offices, holders, open seats.'),
  ('commons.manage', 'Keep the Commons register, Tables kept, the concurrence roll and the Assembly record.'),
  ('guild.manage', 'Keep the hallmark register: formed makers, marks, and destroyed punches.'),
  ('treasury.manage', 'Write the Treasury account that goes into the Annual.'),
  ('encounters.manage', 'Add and edit Encounters on the public calendar.'),
  ('mail.manage', 'Read the Brief subscriber list and send the Brief.'),
  ('safeguarding.read', 'Read concerns raised through the safeguarding route. Held by one named person, never by the people a concern might be about.')
on conflict (key) do nothing;

insert into authz.role_permissions (role_key, permission_key) values
  ('super_admin', 'governance.manage'), ('administrator', 'governance.manage'),
  ('super_admin', 'commons.manage'), ('administrator', 'commons.manage'),
  ('super_admin', 'guild.manage'), ('administrator', 'guild.manage'),
  ('super_admin', 'treasury.manage'), ('administrator', 'treasury.manage'),
  ('super_admin', 'encounters.manage'), ('administrator', 'encounters.manage'),
  ('editor', 'encounters.manage'),
  ('super_admin', 'mail.manage'), ('administrator', 'mail.manage'),
  ('editor', 'mail.manage'),
  ('super_admin', 'safeguarding.read')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 1. Terms documents
-- ---------------------------------------------------------------------
create or replace function publishing.item_public_path(p_type publishing.item_type, p_slug text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'paper' then '/papers/' || p_slug
    when 'brief' then '/brief/' || p_slug
    when 'dispatch' then '/dispatch/' || p_slug
    when 'annual' then '/annual/' || p_slug
    when 'pigeon_post' then '/pigeon-post/' || p_slug
    when 'article' then '/journal/' || p_slug
    when 'sattal' then '/sattal/' || p_slug
    when 'terms' then '/terms/' || p_slug
    else '/' || p_slug
  end;
$$;

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

  if v_item.type not in ('paper', 'brief', 'dispatch', 'pigeon_post', 'annual', 'terms') then
    raise exception 'Only Papers, Briefs, Dispatches, Pigeon Posts, Annuals and terms documents are deposited onto the Record. Use publishing.transition_item to publish a %.', v_item.type;
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

create function publishing.check_terms_slug()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'terms' and new.slug !~ '^(painters|writers|memory|friends)(-v[0-9]+)?$' then
    raise exception 'A terms document is slugged painters, writers, memory or friends, with -v2, -v3 for later versions.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger items_check_terms_slug
  before insert or update of slug, type on publishing.items
  for each row execute function publishing.check_terms_slug();

create view api.terms_versions with (security_invoker = true) as
select
  substring(i.slug from '^(painters|writers|memory|friends)') as kind,
  coalesce(nullif(substring(i.slug from '-v([0-9]+)$'), '')::int, 1) as version,
  i.slug, i.title, i.deposit_ref, i.published_at
from publishing.items i
where i.type = 'terms' and i.status = 'published'
order by 1, 2 desc;
grant select on api.terms_versions to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. The register of hands
-- ---------------------------------------------------------------------
create schema if not exists governance;
comment on schema governance is 'Named roles and offices, who holds them, and which seats are open.';
grant usage on schema governance to anon, authenticated, service_role;

create table governance.roles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (btrim(title) <> ''),
  title_ne        text,
  kind            text not null default 'role' check (kind in ('role', 'office')),
  status          text not null default 'open' check (status in ('held', 'open', 'dormant')),
  holder_name     text,
  -- A dormant office wakes on a stated trigger.
  waking_trigger  text,
  term_starts_on  date,
  term_ends_on    date,
  -- What an open seat asks and gives: the house's words.
  work            text,
  asks            text,
  gives           text,
  how_to_say_yes  text,
  sort            int not null default 0,
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (status <> 'held' or holder_name is not null)
);
create trigger roles_set_updated_at before update on governance.roles
  for each row execute function public.set_updated_at();
create trigger roles_reject_em_dash before insert or update on governance.roles
  for each row when (new.published) execute function publishing.reject_em_dash();

alter table governance.roles enable row level security;
grant select on governance.roles to anon, authenticated;
create policy roles_select_public on governance.roles
  for select to anon, authenticated using (published);
create policy roles_select_staff on governance.roles
  for select to authenticated using ((select authz.has_staff_permission('governance.manage')));

create view api.hands with (security_invoker = true) as
select id, slug, title, title_ne, kind, status, holder_name, waking_trigger,
  term_starts_on, term_ends_on, work, asks, gives, how_to_say_yes, sort
from governance.roles
order by sort, title;
grant select on api.hands to anon, authenticated;

create view api.admin_roles with (security_invoker = true) as
select * from governance.roles order by sort, title;
grant select on api.admin_roles to authenticated;

create function api.save_role(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = governance, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('governance.manage');
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is not null then
    update governance.roles set
      slug = p ->> 'slug', title = p ->> 'title', title_ne = nullif(p ->> 'title_ne', ''),
      kind = coalesce(nullif(p ->> 'kind', ''), kind),
      status = coalesce(nullif(p ->> 'status', ''), status),
      holder_name = nullif(p ->> 'holder_name', ''),
      waking_trigger = nullif(p ->> 'waking_trigger', ''),
      term_starts_on = nullif(p ->> 'term_starts_on', '')::date,
      term_ends_on = nullif(p ->> 'term_ends_on', '')::date,
      work = nullif(p ->> 'work', ''), asks = nullif(p ->> 'asks', ''),
      gives = nullif(p ->> 'gives', ''), how_to_say_yes = nullif(p ->> 'how_to_say_yes', ''),
      sort = coalesce(nullif(p ->> 'sort', '')::int, sort),
      published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
    if not found then raise exception 'Role % does not exist', v_id; end if;
  else
    insert into governance.roles (slug, title, title_ne, kind, status, holder_name, waking_trigger,
      term_starts_on, term_ends_on, work, asks, gives, how_to_say_yes, sort, published)
    values (p ->> 'slug', p ->> 'title', nullif(p ->> 'title_ne', ''),
      coalesce(nullif(p ->> 'kind', ''), 'role'), coalesce(nullif(p ->> 'status', ''), 'open'),
      nullif(p ->> 'holder_name', ''), nullif(p ->> 'waking_trigger', ''),
      nullif(p ->> 'term_starts_on', '')::date, nullif(p ->> 'term_ends_on', '')::date,
      nullif(p ->> 'work', ''), nullif(p ->> 'asks', ''), nullif(p ->> 'gives', ''),
      nullif(p ->> 'how_to_say_yes', ''), coalesce(nullif(p ->> 'sort', '')::int, 0),
      coalesce((p ->> 'published')::boolean, false))
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'governance.role.save', 'governance', 'roles', v_id, null, p);
  return v_id;
end;
$$;
revoke all on function api.save_role from public, anon;
grant execute on function api.save_role(jsonb) to authenticated;

-- The seats the programme names, unpublished and without a word of
-- description: the house writes what each one is, asks and gives, then
-- publishes it. Nothing is claimed as open until the house says so.
insert into governance.roles (slug, title, kind, status, sort) values
  ('photographer', 'Photographer', 'role', 'open', 10),
  ('translator', 'Translator', 'role', 'open', 20),
  ('bookkeeper', 'Bookkeeper', 'role', 'open', 30),
  ('promoter-1', 'Promoter', 'role', 'open', 40),
  ('promoter-2', 'Promoter', 'role', 'open', 41),
  ('promoter-3', 'Promoter', 'role', 'open', 42),
  ('promoter-4', 'Promoter', 'role', 'open', 43),
  ('promoter-5', 'Promoter', 'role', 'open', 44),
  ('guardian-1', 'Guardian', 'role', 'open', 50),
  ('guardian-2', 'Guardian', 'role', 'open', 51),
  ('guardian-3', 'Guardian', 'role', 'open', 52),
  ('outside-reader', 'Outside reader', 'role', 'open', 60),
  ('editor', 'Editor', 'role', 'open', 70),
  ('language-elder', 'Language elder', 'role', 'open', 80),
  ('transcriber', 'Transcriber', 'role', 'open', 90)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 3. The Sattal completed
-- ---------------------------------------------------------------------
alter table sattal.pieces
  add column commissioned_on date,
  add column commissioned_note text,
  add column agreement_signed_on date,
  add column agreement_note text;

create or replace function sattal.enforce_piece_rules()
returns trigger
language plpgsql
security definer
set search_path = sattal, wall, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'published' then
    raise exception 'A published piece is never rewritten. Add a correction instead.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from wall.people p where p.id = new.person_id and 'author' = any (p.roles)) then
    raise exception 'The author of a Sattal piece must be a person with the author role.'
      using errcode = '23514';
  end if;

  if new.status = 'published' then
    -- A Study is commissioned, and the commission is on the record.
    if new.form = 'study' and new.commissioned_on is null then
      raise exception 'A Study is commissioned. Record the commission before publishing.'
        using errcode = '23514';
    end if;
    -- The author agreement is recorded against each piece.
    if new.agreement_signed_on is null then
      raise exception 'The author agreement is not recorded against this piece.'
        using errcode = '23514';
    end if;
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

-- Payment on acceptance is a promise, so it has a ledger of its own:
-- acceptance and payment are separate facts with separate dates.
create table sattal.rate_ledger (
  piece_id     uuid primary key references sattal.pieces (id) on delete restrict,
  rate_minor   bigint not null check (rate_minor >= 0),
  currency     text not null default 'NPR',
  accepted_on  date,
  paid_on      date,
  payment_ref  text,
  check (paid_on is null or accepted_on is not null)
);
alter table sattal.rate_ledger enable row level security;
grant select on sattal.rate_ledger to authenticated;
create policy rate_ledger_select_staff on sattal.rate_ledger
  for select to authenticated using ((select authz.has_staff_permission('sattal.manage')));
create view api.sattal_ledger with (security_invoker = true) as
select l.*, p.title, p.slug from sattal.rate_ledger l join sattal.pieces p on p.id = l.piece_id;
grant select on api.sattal_ledger to authenticated;

create function api.save_sattal_ledger(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = sattal, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('sattal.manage');
  v_piece uuid := (p ->> 'piece_id')::uuid;
begin
  insert into sattal.rate_ledger (piece_id, rate_minor, currency, accepted_on, paid_on, payment_ref)
  values (v_piece, (p ->> 'rate_minor')::bigint, coalesce(nullif(p ->> 'currency', ''), 'NPR'),
    nullif(p ->> 'accepted_on', '')::date, nullif(p ->> 'paid_on', '')::date,
    nullif(p ->> 'payment_ref', ''))
  on conflict (piece_id) do update set
    rate_minor = excluded.rate_minor, accepted_on = excluded.accepted_on,
    paid_on = excluded.paid_on, payment_ref = excluded.payment_ref;
  perform wall.audit(v_actor, 'sattal.ledger.save', 'sattal', 'rate_ledger', v_piece, null, p);
  return v_piece;
end;
$$;
revoke all on function api.save_sattal_ledger from public, anon;
grant execute on function api.save_sattal_ledger(jsonb) to authenticated;

-- The admin view and the save function carry the new fields.
drop view api.admin_sattal_pieces;
create view api.admin_sattal_pieces with (security_invoker = true) as
select p.*, a.name as person_name,
  sattal.is_house_connected(p.about_house, p.subject_work_id, p.subject_person_id) as house_connected
from sattal.pieces p
join wall.people a on a.id = p.person_id
order by p.created_at desc;
grant select on api.admin_sattal_pieces to authenticated;

create or replace function api.save_sattal_piece(p jsonb)
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
      reply_to_piece_id = nullif(p ->> 'reply_to_piece_id', '')::uuid,
      commissioned_on = nullif(p ->> 'commissioned_on', '')::date,
      commissioned_note = nullif(p ->> 'commissioned_note', ''),
      agreement_signed_on = nullif(p ->> 'agreement_signed_on', '')::date,
      agreement_note = nullif(p ->> 'agreement_note', '')
    where id = v_id;
    if not found then
      raise exception 'Piece % does not exist', v_id;
    end if;
  else
    insert into sattal.pieces (slug, form, person_id, title, title_ne, body, body_ne, sources,
      original_language, translation_of, relation_declaration, subject_work_id, subject_person_id,
      about_house, author_connected, outside_reader_id, reader_accepted_on, reply_to_piece_id,
      commissioned_on, commissioned_note, agreement_signed_on, agreement_note)
    values (
      p ->> 'slug', p ->> 'form', (p ->> 'person_id')::uuid, p ->> 'title', nullif(p ->> 'title_ne', ''),
      coalesce(p -> 'body', '{"type": "doc", "content": []}'::jsonb), p -> 'body_ne',
      coalesce(p -> 'sources', '[]'::jsonb), p ->> 'original_language',
      nullif(p ->> 'translation_of', '')::uuid, coalesce(p ->> 'relation_declaration', ''),
      nullif(p ->> 'subject_work_id', '')::uuid, nullif(p ->> 'subject_person_id', '')::uuid,
      coalesce((p ->> 'about_house')::boolean, false), coalesce((p ->> 'author_connected')::boolean, true),
      nullif(p ->> 'outside_reader_id', '')::uuid, nullif(p ->> 'reader_accepted_on', '')::date,
      nullif(p ->> 'reply_to_piece_id', '')::uuid,
      nullif(p ->> 'commissioned_on', '')::date, nullif(p ->> 'commissioned_note', ''),
      nullif(p ->> 'agreement_signed_on', '')::date, nullif(p ->> 'agreement_note', '')
    )
    returning id into v_id;
  end if;
  perform wall.audit(v_actor, 'sattal.piece.save', 'sattal', 'pieces', v_id, null,
    jsonb_build_object('slug', p ->> 'slug', 'form', p ->> 'form'));
  return v_id;
end;
$$;
