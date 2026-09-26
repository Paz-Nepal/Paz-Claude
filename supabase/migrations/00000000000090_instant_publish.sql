-- 0090_instant_publish.sql
--
-- Publish from the CMS with no build and no upload.
--
-- The site's static pages (for search engines, for readers without JavaScript,
-- the sitemap, the feeds) used to be written only by `pnpm site` on a
-- computer and uploaded by hand. Now the render-site Edge Function writes them
-- into a public storage bucket, `site`, and a small Cloudflare Worker serves
-- them, so a change made in the desk is on the public site within about a
-- minute (the cache is thirty seconds) with nobody running anything.
--
-- How it fits together:
--   * Every table whose contents show on the public site marks the site
--     "dirty" when it is written (statement triggers, so a burst of edits is
--     one flag).
--   * pg_cron calls render-site every thirty seconds through pg_net. The
--     function does nothing unless the site is dirty or the app has been
--     redeployed (the pages must always point at the current build's files).
--   * Nothing here is secret in kind, but the call is authenticated by a
--     random shared secret the database made for itself, so a stranger cannot
--     make the site re-render on demand.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- The public bucket the Worker reads from. Only the Edge Function (service
-- role) can write to it: there is no insert policy for anyone else.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- State: one row
-- ---------------------------------------------------------------------
create table admin.site_render_state (
  id               int primary key default 1 check (id = 1),
  dirty            boolean not null default true,
  dirty_since      timestamptz default now(),
  running_since    timestamptz,
  last_started_at  timestamptz,
  last_finished_at timestamptz,
  last_ok          boolean,
  last_message     text,
  last_files       int,
  -- Hash of the app shell the pages were last written against.
  shell_hash       text,
  -- The render-site function's address, set once per environment.
  endpoint         text,
  secret           text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
insert into admin.site_render_state (id) values (1);
alter table admin.site_render_state enable row level security;
-- No grants and no policies: only the definer functions below touch it.

-- ---------------------------------------------------------------------
-- What marks the site dirty
-- ---------------------------------------------------------------------
create function admin.mark_site_dirty()
returns trigger
language plpgsql
security definer
set search_path = admin, pg_temp
as $$
begin
  update admin.site_render_state
     set dirty = true, dirty_since = coalesce(dirty_since, now())
   where id = 1;
  return null;
end;
$$;

-- Items change all the time as drafts; only a change to or from "published"
-- can alter the public site.
create trigger site_dirty_items_insert after insert on publishing.items
  for each row when (new.status = 'published') execute function admin.mark_site_dirty();
create trigger site_dirty_items_update after update on publishing.items
  for each row when (old.status = 'published' or new.status = 'published')
  execute function admin.mark_site_dirty();
create trigger site_dirty_items_delete after delete on publishing.items
  for each row when (old.status = 'published') execute function admin.mark_site_dirty();

do $$
declare
  t text;
begin
  foreach t in array array[
    'publishing.paper_details', 'publishing.brief_details', 'publishing.dispatch_details',
    'publishing.pigeon_post_details', 'publishing.annual_details', 'publishing.event_details',
    'publishing.tags', 'publishing.item_tags', 'publishing.glossary_terms',
    'publishing.chronicle_lines', 'publishing.objects', 'publishing.pigeon_post_distribution',
    'publishing.redirects', 'publishing.record_entries',
    'wall.people', 'wall.works', 'wall.work_images', 'wall.work_events', 'wall.work_texts',
    'wall.shows', 'wall.show_works', 'wall.person_exhibitions', 'wall.person_writings',
    'sattal.pieces', 'sattal.outside_readers', 'sattal.corrections',
    'house.rooms', 'house.room_images', 'house.things', 'house.wanted', 'house.books',
    'house.studio_months', 'house.days', 'house.day_dates',
    'record.accessions', 'record.consent_lines', 'record.parts', 'record.house_papers',
    'record.listenings',
    'encounters.events', 'encounters.places', 'encounters.place_visits',
    'governance.roles', 'guild.makers', 'guild.punch_destructions', 'treasury.accounts',
    'programs.programs', 'programs.sessions', 'programs.venues', 'membership.tiers',
    'admin.settings', 'admin.site_wording'
  ]
  loop
    -- A table this database does not have yet is skipped, not an error.
    if to_regclass(t) is not null then
      execute format(
        'create trigger site_dirty after insert or update or delete on %s '
        'for each statement execute function admin.mark_site_dirty()', t);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- The render-site function's side of the handshake (service role only)
-- ---------------------------------------------------------------------
create function api.site_render_secret()
returns text
language sql
stable
security definer
set search_path = admin, pg_temp
as $$ select secret from admin.site_render_state where id = 1; $$;

-- Starts a render if there is a reason to: the site changed, the app was
-- redeployed, or the last attempt failed. Returns false when there is nothing
-- to do or another render is already running (for up to five minutes).
create function api.site_render_begin(p_shell_hash text)
returns boolean
language plpgsql
volatile
security definer
set search_path = admin, pg_temp
as $$
declare
  s admin.site_render_state;
begin
  select * into s from admin.site_render_state where id = 1 for update;
  if s.running_since is not null and s.running_since > now() - interval '5 minutes' then
    return false;
  end if;
  if not (s.dirty or s.shell_hash is distinct from p_shell_hash or coalesce(s.last_ok, false) = false) then
    return false;
  end if;
  -- Cleared before the render, so an edit made during it marks the site dirty
  -- again and is picked up by the next one.
  update admin.site_render_state
     set running_since = now(), last_started_at = now(), dirty = false, dirty_since = null
   where id = 1;
  return true;
end;
$$;

create function api.site_render_finish(
  p_ok boolean, p_message text, p_files int, p_shell_hash text
)
returns void
language sql
volatile
security definer
set search_path = admin, pg_temp
as $$
  update admin.site_render_state
     set running_since = null,
         last_finished_at = now(),
         last_ok = p_ok,
         last_message = left(p_message, 500),
         last_files = p_files,
         shell_hash = case when p_ok then p_shell_hash else shell_hash end,
         dirty = dirty or not p_ok
   where id = 1;
$$;

revoke all on function api.site_render_secret(), api.site_render_begin(text),
  api.site_render_finish(boolean, text, int, text) from public, anon, authenticated;
grant execute on function api.site_render_secret(), api.site_render_begin(text),
  api.site_render_finish(boolean, text, int, text) to service_role;

-- ---------------------------------------------------------------------
-- What staff can see and do
-- ---------------------------------------------------------------------
create view api.site_publishing_status with (security_invoker = false) as
select s.dirty, s.running_since, s.last_finished_at, s.last_ok, s.last_message,
       s.last_files, (s.endpoint is not null) as connected
from admin.site_render_state s
where s.id = 1 and (select authz.has_staff_permission('admin.settings.read'));
grant select on api.site_publishing_status to authenticated;

-- "Publish now": mark the site dirty. The next thirty-second tick renders it.
create function api.request_site_render()
returns void
language plpgsql
volatile
security definer
set search_path = admin, wall, authz, pg_temp
as $$
declare
  v_actor uuid := wall.require('publishing.item.update');
begin
  update admin.site_render_state set dirty = true, dirty_since = coalesce(dirty_since, now()) where id = 1;
  perform wall.audit(v_actor, 'site.render.request', 'admin', 'site_render_state', null, null, null);
end;
$$;
revoke all on function api.request_site_render() from public, anon;
grant execute on function api.request_site_render() to authenticated;

-- ---------------------------------------------------------------------
-- The clock: every thirty seconds, ask the function whether there is work.
-- It stays idle until the endpoint is set:
--   update admin.site_render_state set endpoint =
--     'https://<project-ref>.supabase.co/functions/v1/render-site';
-- ---------------------------------------------------------------------
select cron.schedule(
  'render-site',
  '30 seconds',
  $job$
    select net.http_post(
      url := s.endpoint,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-render-secret', s.secret),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    )
    from admin.site_render_state s
    where s.id = 1 and s.endpoint is not null
  $job$
);
