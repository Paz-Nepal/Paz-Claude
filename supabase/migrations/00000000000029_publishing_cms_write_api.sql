-- 0029_publishing_cms_write_api.sql
--
-- PAZ Website & CMS spec: the write-side CMS surface for the deposit model
-- (Task 20) -- bilingual editing on the core item, per-series detail
-- upserts, and the deposit/discard workflow actions. Read-side (0026) and
-- schema (0025) already shipped; this is what makes the desk editor able
-- to actually produce a Paper/Brief/Dispatch/Pigeon Post/Annual instead of
-- only a generic article/page.

-- ---------------------------------------------------------------------
-- Guard deposit_item to the five real deposit series (spec §2's Record
-- description: Papers, Briefs, Dispatches, Annuals, Pigeon Posts -- not
-- generic articles/pages/events). Prevents the Record from ever
-- accidentally acquiring an entry for a type it was never meant to index.
-- ---------------------------------------------------------------------
create or replace function publishing.deposit_item(p_item uuid)
returns publishing.items
language plpgsql
security definer
set search_path = publishing, authz, admin, pg_temp
as $$
declare
  v_item publishing.items;
  v_ref text;
  v_deposit_number text;
  v_path_segment text;
begin
  select * into v_item from publishing.items where id = p_item for update;
  if not found then
    raise exception 'Item % does not exist', p_item;
  end if;

  if v_item.type not in ('paper', 'brief', 'dispatch', 'pigeon_post', 'annual') then
    raise exception 'Only Papers, Briefs, Dispatches, Pigeon Posts, and Annuals are deposited onto the Record. Use publishing.transition_item to publish a %.', v_item.type;
  end if;

  v_ref := publishing.next_deposit_ref();
  v_deposit_number := v_ref;

  update publishing.items set deposit_ref = v_ref where id = p_item;

  v_item := publishing.transition_item(p_item, 'published');

  v_path_segment := case v_item.type
    when 'paper' then 'papers'
    when 'pigeon_post' then 'pigeon-post'
    else v_item.type::text
  end;

  insert into publishing.record_entries
    (deposit_number, item_id, entry_type, title, provenance, link)
  values (
    v_deposit_number,
    v_item.id,
    v_item.type,
    v_item.title,
    'Kept by the house · Deposited in the Record',
    '/' || v_path_segment || '/' || v_item.slug
  );

  return v_item;
end;
$$;

revoke all on function publishing.deposit_item(uuid) from public, anon;
grant execute on function publishing.deposit_item(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- api.deposit_item / api.discard_draft -- thin wrappers, same shape as
-- the existing api.transition_item (0008).
-- ---------------------------------------------------------------------
create function api.deposit_item(p_id uuid)
returns publishing.item_status
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select (publishing.deposit_item(p_id)).status;
$$;

revoke all on function api.deposit_item from public, anon;
grant execute on function api.deposit_item to authenticated;

create function api.discard_draft(p_id uuid)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select publishing.discard_draft(p_id);
$$;

revoke all on function api.discard_draft from public, anon;
grant execute on function api.discard_draft to authenticated;

-- ---------------------------------------------------------------------
-- api.save_item -- add bilingual columns. Signature changes (new
-- params), so this is a genuinely new overload; drop the old one so the
-- desk editor can't accidentally call a stale 8-arg version.
-- ---------------------------------------------------------------------
drop function api.save_item(uuid, publishing.item_type, text, text, text, text, jsonb, uuid);

create function api.save_item(
  p_id uuid,
  p_type publishing.item_type,
  p_slug text,
  p_title text,
  p_title_ne text,
  p_subtitle text,
  p_subtitle_ne text,
  p_summary text,
  p_summary_ne text,
  p_body jsonb,
  p_body_ne jsonb,
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
      (type, slug, title, title_ne, subtitle, subtitle_ne, summary, summary_ne,
       body, body_ne, featured_media, author)
    values (
      p_type, p_slug, p_title, p_title_ne, p_subtitle, p_subtitle_ne,
      p_summary, p_summary_ne,
      coalesce(p_body, '{"type": "doc", "content": []}'::jsonb), p_body_ne,
      p_featured_media,
      (select authz.current_person_id())
    )
    returning id into v_id;
  else
    update publishing.items
    set
      slug = p_slug,
      title = p_title,
      title_ne = p_title_ne,
      subtitle = p_subtitle,
      subtitle_ne = p_subtitle_ne,
      summary = p_summary,
      summary_ne = p_summary_ne,
      body = coalesce(p_body, body),
      body_ne = p_body_ne,
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

-- ---------------------------------------------------------------------
-- api.get_item -- add bilingual + deposit_ref + a details blob so the
-- editor can fetch core + series fields in one round trip. `details` is
-- a jsonb grab-bag on purpose (unlike the public api.get_paper etc.,
-- which are strongly typed per series): this one function backs every
-- series' editor, and the editor component for each type already knows
-- which keys to expect.
-- ---------------------------------------------------------------------
drop function api.get_item(uuid);

create function api.get_item(p_id uuid)
returns table (
  id uuid,
  type publishing.item_type,
  status publishing.item_status,
  slug text,
  title text,
  title_ne text,
  subtitle text,
  subtitle_ne text,
  summary text,
  summary_ne text,
  body jsonb,
  body_ne jsonb,
  body_schema_version int,
  featured_media uuid,
  featured_media_path text,
  author uuid,
  author_name text,
  deposit_ref text,
  updated_at timestamptz,
  published_at timestamptz,
  tags text[],
  details jsonb
)
language sql
stable
security invoker
set search_path = publishing, identity, pg_temp
as $$
  select
    i.id, i.type, i.status, i.slug, i.title, i.title_ne, i.subtitle, i.subtitle_ne,
    i.summary, i.summary_ne, i.body, i.body_ne, i.body_schema_version,
    i.featured_media, m.storage_path,
    i.author, identity.display_name(i.author), i.deposit_ref, i.updated_at, i.published_at,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it
       join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    case i.type
      when 'paper' then (select to_jsonb(d) from publishing.paper_details d where d.item_id = i.id)
      when 'brief' then (select to_jsonb(d) from publishing.brief_details d where d.item_id = i.id)
      when 'dispatch' then (select to_jsonb(d) from publishing.dispatch_details d where d.item_id = i.id)
      when 'pigeon_post' then (select to_jsonb(d) from publishing.pigeon_post_details d where d.item_id = i.id)
      when 'annual' then (select to_jsonb(d) from publishing.annual_details d where d.item_id = i.id)
      when 'event' then (select to_jsonb(d) from publishing.event_details d where d.item_id = i.id)
      else null
    end
  from publishing.items i
  left join publishing.media m on m.id = i.featured_media
  where i.id = p_id;
$$;

revoke all on function api.get_item from public, anon;
grant execute on function api.get_item to authenticated;

-- ---------------------------------------------------------------------
-- Per-series detail upserts. One thin function per series (same
-- reasoning as the 0026 read side): each editor component calls exactly
-- the one that matches its type, so a Pigeon Post editor is structurally
-- incapable of sending an author field -- there is no parameter for it.
-- ---------------------------------------------------------------------
create function api.save_paper_details(
  p_item uuid, p_abstract text, p_pdf_media uuid, p_license text, p_sources_note text
)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  insert into publishing.paper_details (item_id, abstract, pdf_media, license, sources_note)
  values (p_item, p_abstract, p_pdf_media, p_license, p_sources_note)
  on conflict (item_id) do update set
    abstract = excluded.abstract,
    pdf_media = excluded.pdf_media,
    license = excluded.license,
    sources_note = excluded.sources_note;
$$;

revoke all on function api.save_paper_details from public, anon;
grant execute on function api.save_paper_details to authenticated;

create function api.save_brief_details(p_item uuid, p_issue_date date)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  insert into publishing.brief_details (item_id, issue_date)
  values (p_item, coalesce(p_issue_date, current_date))
  on conflict (item_id) do update set issue_date = excluded.issue_date;
$$;

revoke all on function api.save_brief_details from public, anon;
grant execute on function api.save_brief_details to authenticated;

create function api.save_dispatch_details(p_item uuid, p_issue_date date)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  insert into publishing.dispatch_details (item_id, issue_date)
  values (p_item, coalesce(p_issue_date, current_date))
  on conflict (item_id) do update set issue_date = excluded.issue_date;
$$;

revoke all on function api.save_dispatch_details from public, anon;
grant execute on function api.save_dispatch_details to authenticated;

-- No author/contributor parameter -- intentionally, permanently absent
-- (spec §2/§5).
create function api.save_pigeon_post_details(p_item uuid, p_edition_no text, p_pdf_media uuid)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  insert into publishing.pigeon_post_details (item_id, edition_no, pdf_media)
  values (p_item, p_edition_no, p_pdf_media)
  on conflict (item_id) do update set
    edition_no = excluded.edition_no,
    pdf_media = excluded.pdf_media;
$$;

revoke all on function api.save_pigeon_post_details from public, anon;
grant execute on function api.save_pigeon_post_details to authenticated;

create function api.save_annual_details(
  p_item uuid, p_year int, p_contents text, p_pdf_media uuid
)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  insert into publishing.annual_details (item_id, year, contents, pdf_media)
  values (p_item, p_year, p_contents, p_pdf_media)
  on conflict (item_id) do update set
    year = excluded.year,
    contents = excluded.contents,
    pdf_media = excluded.pdf_media;
$$;

revoke all on function api.save_annual_details from public, anon;
grant execute on function api.save_annual_details to authenticated;

create function api.save_event_details(p_item uuid, p_event_date timestamptz, p_location text)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  insert into publishing.event_details (item_id, event_date, location)
  values (p_item, p_event_date, p_location)
  on conflict (item_id) do update set
    event_date = excluded.event_date,
    location = excluded.location;
$$;

revoke all on function api.save_event_details from public, anon;
grant execute on function api.save_event_details to authenticated;
