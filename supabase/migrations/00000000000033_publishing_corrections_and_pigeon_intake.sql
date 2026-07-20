-- 0033_publishing_corrections_and_pigeon_intake.sql
--
-- Two remaining gaps in the CMS write surface, closed together since both
-- touch publishing.items:
--
-- 1. Corrections. Non-negotiable §3 requires deposited content to be
--    correctable "by addition... never by destruction" -- migration 0025
--    added previous_version_of/superseded_by columns and the append-only
--    trigger, but nothing ever *used* them. A deposited item could not
--    actually be corrected through the CMS. publishing.create_correction()
--    is the missing piece: draft a new item linked back to the original
--    (copying its series details so staff aren't retyping license/abstract/
--    etc.), and deposit_item() now closes the loop by marking the
--    original superseded_by the new item's id at the moment the
--    correction itself is deposited.
--
-- 2. Send a pigeon. Spec §2/§3: "a simple, non-tracking submission route —
--    content goes to house staff, not published automatically." Deferred
--    earlier pending a spam/rate-limiting (Turnstile) decision -- built
--    now as a plain intake with no CAPTCHA; that remains a known gap
--    (same T-068 gap as the general contact form) but the feature itself
--    -- a private inbox, reviewed by hand -- is what the spec actually
--    requires, and does not depend on that decision to exist. Contributor
--    name/contact, if given, stays staff-only forever -- consistent with
--    Pigeon Post's own no-public-attribution rule, extended to the intake
--    that might someday become one.

-- ---------------------------------------------------------------------
-- publishing.pigeon_submissions -- private inbox, never public
-- ---------------------------------------------------------------------
create table publishing.pigeon_submissions (
  id                  uuid primary key default gen_random_uuid(),
  contributor_name    text,
  contributor_contact text,
  content             text not null,
  submitted_at        timestamptz not null default now(),
  reviewed            boolean not null default false,
  reviewed_by         uuid references identity.people (id) on delete restrict,
  reviewed_at         timestamptz
);
comment on table publishing.pigeon_submissions is
  'Public contributions that might become a future Pigeon Post -- reviewed '
  'by hand, never auto-published (spec §2/§3). Contributor identity is '
  'staff-only forever, same anonymity rule as the published series itself '
  '(0025''s pigeon_post_details comment): it is never selected by any '
  'anon-facing view or function.';

alter table publishing.pigeon_submissions enable row level security;
grant select on publishing.pigeon_submissions to authenticated;
grant update on publishing.pigeon_submissions to authenticated;
-- No insert grant: written only by publishing.submit_pigeon() (security
-- definer), so a contributor with no account can still submit.
-- No delete grant to anyone: an inbox that can be silently emptied isn't
-- one an owner can audit -- reviewed=true is how an entry leaves view,
-- not deletion.

create policy pigeon_submissions_select_staff on publishing.pigeon_submissions
  for select to authenticated
  using ((select authz.has_staff_permission('publishing.item.read')));
create policy pigeon_submissions_update_staff on publishing.pigeon_submissions
  for update to authenticated
  using ((select authz.has_staff_permission('publishing.item.update')))
  with check ((select authz.has_staff_permission('publishing.item.update')));

create function publishing.submit_pigeon(
  p_contributor_name text,
  p_contributor_contact text,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = publishing, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_content is null or btrim(p_content) = '' then
    raise exception 'Nothing to send';
  end if;
  insert into publishing.pigeon_submissions (contributor_name, contributor_contact, content)
  values (nullif(btrim(coalesce(p_contributor_name, '')), ''),
          nullif(btrim(coalesce(p_contributor_contact, '')), ''),
          btrim(p_content))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function publishing.submit_pigeon from public;
grant execute on function publishing.submit_pigeon to anon, authenticated;

create function api.send_a_pigeon(p_contributor_name text, p_contributor_contact text, p_content text)
returns void
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select publishing.submit_pigeon(p_contributor_name, p_contributor_contact, p_content);
$$;

revoke all on function api.send_a_pigeon from public;
grant execute on function api.send_a_pigeon to anon, authenticated;

create view api.pigeon_submissions
with (security_invoker = true)
as
select id, contributor_name, contributor_contact, content, submitted_at, reviewed, reviewed_at
from publishing.pigeon_submissions
order by submitted_at desc;

grant select on api.pigeon_submissions to authenticated;

create function api.mark_pigeon_submission_reviewed(p_id uuid)
returns void
language sql
volatile
security invoker
set search_path = publishing, authz, pg_temp
as $$
  update publishing.pigeon_submissions
  set reviewed = true, reviewed_by = (select authz.current_person_id()), reviewed_at = now()
  where id = p_id;
$$;

revoke all on function api.mark_pigeon_submission_reviewed from public, anon;
grant execute on function api.mark_pigeon_submission_reviewed to authenticated;

-- ---------------------------------------------------------------------
-- publishing.create_correction(original) -- the one path to a correction
-- ---------------------------------------------------------------------
create function publishing.create_correction(p_original uuid)
returns uuid
language plpgsql
security invoker
set search_path = publishing, authz, pg_temp
as $$
declare
  v_orig publishing.items;
  v_new_id uuid;
begin
  select * into v_orig from publishing.items where id = p_original;
  if not found then
    raise exception 'Item % does not exist', p_original;
  end if;
  if v_orig.status <> 'published' then
    raise exception 'Only a deposited (published) item can be corrected';
  end if;
  if v_orig.superseded_by is not null then
    raise exception 'This item already has a newer version';
  end if;

  -- RLS (items_insert_author, 0008) is what actually authorizes this --
  -- it requires author = current_person_id(), status = 'draft', and
  -- publishing.item.create, all satisfied by this insert.
  insert into publishing.items
    (type, slug, title, title_ne, subtitle, subtitle_ne, summary, summary_ne,
     body, body_ne, featured_media, author, previous_version_of)
  values (
    v_orig.type, v_orig.slug || '-correction-' || to_char(now(), 'YYYYMMDD'),
    v_orig.title, v_orig.title_ne, v_orig.subtitle, v_orig.subtitle_ne,
    v_orig.summary, v_orig.summary_ne, v_orig.body, v_orig.body_ne,
    v_orig.featured_media, (select authz.current_person_id()), p_original
  )
  returning id into v_new_id;

  -- Carry the series details forward too -- a correction to a Paper
  -- shouldn't force staff to retype the license and abstract from
  -- scratch. Exactly one of these matches v_orig.type; the other four
  -- affect zero rows.
  insert into publishing.paper_details (item_id, abstract, pdf_media, license, sources_note)
    select v_new_id, abstract, pdf_media, license, sources_note
    from publishing.paper_details where item_id = p_original;
  insert into publishing.brief_details (item_id, issue_date)
    select v_new_id, issue_date from publishing.brief_details where item_id = p_original;
  insert into publishing.dispatch_details (item_id, issue_date)
    select v_new_id, issue_date from publishing.dispatch_details where item_id = p_original;
  insert into publishing.pigeon_post_details (item_id, edition_no, pdf_media)
    select v_new_id, edition_no, pdf_media
    from publishing.pigeon_post_details where item_id = p_original;
  insert into publishing.annual_details (item_id, year, contents, pdf_media)
    select v_new_id, year, contents, pdf_media
    from publishing.annual_details where item_id = p_original;

  return v_new_id;
end;
$$;

revoke all on function publishing.create_correction from public, anon;
grant execute on function publishing.create_correction to authenticated;

create function api.create_correction(p_original uuid)
returns uuid
language sql
volatile
security invoker
set search_path = publishing, pg_temp
as $$
  select publishing.create_correction(p_original);
$$;

revoke all on function api.create_correction from public, anon;
grant execute on function api.create_correction to authenticated;

-- ---------------------------------------------------------------------
-- deposit_item() -- close the loop: depositing a correction marks the
-- item it corrects as superseded, in the same transaction.
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

  if v_item.previous_version_of is not null then
    update publishing.items set superseded_by = v_item.id where id = v_item.previous_version_of;
  end if;

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
-- Public read side: expose superseded_by's slug so a corrected item's
-- page can link to its replacement. Drop + recreate (RETURNS TABLE shape
-- change), same reasoning as 0026.
-- ---------------------------------------------------------------------
drop function api.get_paper(text);
create function api.get_paper(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, published_at timestamptz, tags text[],
  paper_no int, abstract text, pdf_path text, license text, sources_note text,
  superseded_by_slug text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne,
    i.deposit_ref, i.published_at,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    d.paper_no, d.abstract, pm.storage_path, d.license, d.sources_note,
    su.slug
  from publishing.items i
  join publishing.paper_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  left join publishing.items su on su.id = i.superseded_by
  where i.type = 'paper' and i.slug = p_slug and i.status = 'published';
$$;
comment on function api.get_paper(text) is
  'No byline field on purpose: the page always renders the fixed string '
  '"A Paz Paper" (spec §2), never author_name. No published_at rendering '
  'either -- Papers are not dated on the page -- but the column stays in '
  'the query for ordering the index list, same as every other series.';
grant execute on function api.get_paper(text) to anon, authenticated;

drop function api.get_brief(text);
create function api.get_brief(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, tags text[], issue_no int, issue_date date,
  superseded_by_slug text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne, i.deposit_ref,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    d.issue_no, d.issue_date, su.slug
  from publishing.items i
  join publishing.brief_details d on d.item_id = i.id
  left join publishing.items su on su.id = i.superseded_by
  where i.type = 'brief' and i.slug = p_slug and i.status = 'published';
$$;
grant execute on function api.get_brief(text) to anon, authenticated;

drop function api.get_dispatch(text);
create function api.get_dispatch(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, body jsonb, body_ne jsonb,
  deposit_ref text, tags text[], issue_no int, issue_date date,
  superseded_by_slug text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.body, i.body_ne, i.deposit_ref,
    coalesce(
      (select array_agg(t.name order by t.name)
       from publishing.item_tags it join publishing.tags t on t.id = it.tag_id
       where it.item_id = i.id),
      '{}'
    ),
    d.issue_no, d.issue_date, su.slug
  from publishing.items i
  join publishing.dispatch_details d on d.item_id = i.id
  left join publishing.items su on su.id = i.superseded_by
  where i.type = 'dispatch' and i.slug = p_slug and i.status = 'published';
$$;
grant execute on function api.get_dispatch(text) to anon, authenticated;

drop function api.get_pigeon_post(text);
create function api.get_pigeon_post(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, deposit_ref text,
  edition_no text, pdf_path text, superseded_by_slug text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.deposit_ref,
    d.edition_no, pm.storage_path, su.slug
  from publishing.items i
  join publishing.pigeon_post_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  left join publishing.items su on su.id = i.superseded_by
  where i.type = 'pigeon_post' and i.slug = p_slug and i.status = 'published';
$$;
comment on function api.get_pigeon_post(text) is
  'No author/contributor field anywhere in this query -- pigeon_post_details '
  'has none to select (spec §2/§5).';
grant execute on function api.get_pigeon_post(text) to anon, authenticated;

drop function api.get_annual(text);
create function api.get_annual(p_slug text)
returns table (
  id uuid, slug text, title text, title_ne text, deposit_ref text,
  year int, contents text, pdf_path text, superseded_by_slug text
)
language sql
stable
security invoker
set search_path = publishing, pg_temp
as $$
  select
    i.id, i.slug, i.title, i.title_ne, i.deposit_ref,
    d.year, d.contents, pm.storage_path, su.slug
  from publishing.items i
  join publishing.annual_details d on d.item_id = i.id
  left join publishing.media pm on pm.id = d.pdf_media
  left join publishing.items su on su.id = i.superseded_by
  where i.type = 'annual' and i.slug = p_slug and i.status = 'published';
$$;
grant execute on function api.get_annual(text) to anon, authenticated;
