-- 0092_app_bucket.sql
--
-- The app itself (scripts, styles, fonts and the shell) now lives in a public
-- storage bucket that the Cloudflare Worker serves, so a deploy no longer
-- depends on a manual upload to the web host. It is a bucket of its own, apart
-- from `site`, because render-site clears out anything in `site` that is not a
-- page it just wrote. Only the service role writes to it (no insert policy).
insert into storage.buckets (id, name, public)
values ('app', 'app', true)
on conflict (id) do nothing;
