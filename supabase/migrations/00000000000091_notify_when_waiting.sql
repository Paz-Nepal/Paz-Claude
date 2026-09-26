-- 0091_notify_when_waiting.sql
--
-- Some things people send the house need a human to notice them: a safeguarding
-- concern, a request to leave or to have details removed, an offer, a voice.
-- None of them sent any notification, so they would sit until someone happened
-- to sign in. Two settings name who is told, and the Edge Functions send a
-- one-line "something is waiting" message that never carries what was written.
--
-- A safeguarding concern goes only to the one address named for it (never
-- falling back to a general one, so a concern still never passes through the
-- person it might be about). Everything else goes to the desk address, or to
-- the site's contact address until a desk address is set.
insert into admin.settings (key, value, description) values
  ('notify.concerns_email', 'null'::jsonb,
   'Who is told, by a message with no content in it, that a safeguarding concern is waiting. One named holder. Empty means no one is told.'),
  ('notify.desk_email', 'null'::jsonb,
   'Who is told, by a message with no content in it, that an offer, a voice or a request to leave is waiting. Empty means the site''s contact address is used.')
on conflict (key) do nothing;

create function api.notify_address(p_kind text)
returns text
language sql
stable
security definer
set search_path = admin, pg_temp
as $$
  select case
    when p_kind = 'concern' then
      nullif(btrim((select s.value #>> '{}' from admin.settings s where s.key = 'notify.concerns_email')), '')
    else
      coalesce(
        nullif(btrim((select s.value #>> '{}' from admin.settings s where s.key = 'notify.desk_email')), ''),
        nullif(btrim((select s.value #>> '{}' from admin.settings s where s.key = 'site.contact_email')), '')
      )
  end;
$$;
comment on function api.notify_address(text) is
  'Who to tell that something is waiting. A concern has its own address and no fallback.';
revoke all on function api.notify_address(text) from public, anon, authenticated;
grant execute on function api.notify_address(text) to service_role;
