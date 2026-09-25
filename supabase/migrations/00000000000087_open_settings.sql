-- 0087_open_settings.sql
--
-- Three settings the house has not yet decided (docs/website-additions.md "waits
-- on"): the early-painter house price, the Sattal's rate, and how long names
-- stay in the Record's listening log. Each is seeded empty so it appears on
-- Admin, Settings and the house can fill it in; while it is empty nothing is
-- shown, nothing is stripped and no price is invented.
--
-- The Settings page saves what is typed as text, so the readers below accept a
-- number stored either way, and treat blank as unset.
insert into admin.settings (key, value, description) values
  ('wall.early_price_minor', 'null'::jsonb,
   'The one house price for an early painter''s work, in paisa (NPR 7,000 is 700000). Empty until the house decides.'),
  ('sattal.rate_minor', 'null'::jsonb,
   'What the Sattal pays for a piece, in paisa. Shown on the Sattal writing page once set.'),
  ('record.listening_names_days', 'null'::jsonb,
   'How many days a listener''s name is kept in the Record''s listening log before only the count remains. Nothing is stripped while this is empty.')
on conflict (key) do nothing;

create or replace function wall.early_price_minor()
returns bigint
language sql
stable
security definer
set search_path = admin, pg_temp
as $$
  select nullif(btrim(s.value #>> '{}'), '')::bigint
  from admin.settings s where s.key = 'wall.early_price_minor';
$$;

create or replace function record.strip_listening_names()
returns int
language plpgsql
volatile
security definer
set search_path = record, admin, pg_temp
as $$
declare
  v_days int;
  v_n int;
begin
  select nullif(btrim(s.value #>> '{}'), '')::int into v_days
  from admin.settings s where s.key = 'record.listening_names_days';
  if v_days is null or v_days < 0 then
    return 0;
  end if;
  update record.listenings
     set who = null, names_stripped_at = now()
   where who is not null and listened_at < now() - make_interval(days => v_days);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
