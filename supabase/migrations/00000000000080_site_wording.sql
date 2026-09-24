-- 0080_site_wording.sql
--
-- The fixed wording of the public site, made editable from the desk.
--
-- Every line the site says that is not itself deposited work (menus, the
-- footer, page intros, the house's standing lines, form labels and help,
-- empty-section sentences, the not-found page) has a default written in
-- the code: apps/web/src/modules/site/wording.json. That file is the
-- register of every key and what it says until the house says otherwise.
--
-- This table holds only the house's own rewordings. A row exists for a key
-- the house has changed; removing the row returns the line to its default.
-- So an empty table is a site that reads exactly as it did before this
-- migration, and nothing here can leave a line blank: a key with neither an
-- English nor a Nepali rewording has no row at all.
--
-- The Nepali column is the interface's Nepali. When a reader is on /ne and
-- a line has no Nepali, the English (reworded or default) is shown, the same
-- fallback every bilingual field on the site already uses.
--
-- Also here: the Friends of PAZ tiers get a desk form (names, prices and
-- descriptions were only changeable in the database until now) and Nepali
-- names and descriptions.

-- ---------------------------------------------------------------------
-- Permission
-- ---------------------------------------------------------------------
insert into authz.permissions (key, description) values
  ('site.wording.manage', 'Reword the fixed lines of the public site: menus, footer, page intros, form labels, empty sections.')
on conflict (key) do nothing;

-- Written as a select over authz.roles so it applies cleanly on a fresh
-- database too, where the roles arrive later from supabase/seed/authz.sql.
insert into authz.role_permissions (role_key, permission_key)
select r.key, g.permission_key
from (values
  ('super_admin', 'site.wording.manage'),
  ('administrator', 'site.wording.manage'),
  ('editor', 'site.wording.manage'),
  -- membership.tier.manage was seeded for membership_manager only; the
  -- people who keep the site also keep the Friends tiers.
  ('super_admin', 'membership.tier.manage'),
  ('administrator', 'membership.tier.manage')
) as g (role_key, permission_key)
join authz.roles r on r.key = g.role_key
join authz.permissions p on p.key = g.permission_key
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 0. Settings could never be saved from the desk
-- ---------------------------------------------------------------------
-- 0006 gave authenticated SELECT on admin.settings and wrote the policy
-- settings_manage_staff for staff holding admin.settings.manage, but never
-- granted INSERT or UPDATE, and api.update_setting runs as the caller. So
-- every save on the Settings page failed with "permission denied" (the
-- site name, the tagline, and the public contact address among them), and
-- supabase/tests/admin/03 failed on the same line. The policy is what
-- limits who may write; this grant only lets the policy be reached.
grant insert, update on admin.settings to authenticated;

-- ---------------------------------------------------------------------
-- 1. admin.site_wording
-- ---------------------------------------------------------------------
create table admin.site_wording (
  -- Mirrors the keys in wording.json ("area.name", lower case, dots and
  -- dashes). A key the code no longer knows is harmless: nothing reads it.
  key         text primary key check (key ~ '^[a-z0-9]+(\.[a-z0-9-]+)+$'),
  en          text check (en is null or btrim(en) <> ''),
  ne          text check (ne is null or btrim(ne) <> ''),
  updated_by  uuid references identity.people (id) on delete restrict,
  updated_at  timestamptz not null default now(),
  constraint site_wording_says_something check (en is not null or ne is not null)
);
comment on table admin.site_wording is
  'The house''s rewordings of the public site''s fixed lines. Defaults live '
  'in apps/web/src/modules/site/wording.json; a row here overrides one key, '
  'and deleting the row returns it to the default.';

create trigger site_wording_set_updated_at
  before update on admin.site_wording
  for each row execute function public.set_updated_at();

-- The house style holds here as everywhere else on the site.
create trigger site_wording_reject_em_dash
  before insert or update on admin.site_wording
  for each row execute function publishing.reject_em_dash();

alter table admin.site_wording enable row level security;
-- No direct grants: the public reads through api.site_wording(), staff
-- write through api.save_site_wording().

-- ---------------------------------------------------------------------
-- 2. Reading: public, every row (the wording is what the site says aloud)
-- ---------------------------------------------------------------------
create function api.site_wording()
returns table (key text, en text, ne text, updated_at timestamptz)
language sql
stable
security definer
set search_path = admin, pg_temp
as $$
  select w.key, w.en, w.ne, w.updated_at from admin.site_wording w order by w.key;
$$;
comment on function api.site_wording() is
  'Every rewording the house has made. Public on purpose: these are lines '
  'the site shows to every reader.';

revoke all on function api.site_wording() from public;
grant execute on function api.site_wording() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Writing: one key at a time, audited. Both blank means "use the default".
-- ---------------------------------------------------------------------
create function api.save_site_wording(p_key text, p_en text, p_ne text)
returns void
language plpgsql
volatile
security definer
set search_path = admin, wall, authz, pg_temp
as $$
declare
  v_actor uuid := wall.require('site.wording.manage');
  v_en text := nullif(btrim(coalesce(p_en, '')), '');
  v_ne text := nullif(btrim(coalesce(p_ne, '')), '');
  v_before jsonb;
begin
  select to_jsonb(w) into v_before from admin.site_wording w where w.key = p_key;

  if v_en is null and v_ne is null then
    delete from admin.site_wording where key = p_key;
    if v_before is not null then
      perform wall.audit(v_actor, 'site.wording.reset', 'admin', 'site_wording', null,
        v_before, jsonb_build_object('key', p_key));
    end if;
    return;
  end if;

  insert into admin.site_wording (key, en, ne, updated_by)
  values (p_key, v_en, v_ne, v_actor)
  on conflict (key) do update
    set en = excluded.en, ne = excluded.ne, updated_by = excluded.updated_by;

  perform wall.audit(v_actor, 'site.wording.save', 'admin', 'site_wording', null,
    v_before, jsonb_build_object('key', p_key, 'en', v_en, 'ne', v_ne));
end;
$$;
revoke all on function api.save_site_wording from public, anon;
grant execute on function api.save_site_wording(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Friends of PAZ tiers: Nepali, and a desk form
-- ---------------------------------------------------------------------
alter table membership.tiers
  add column if not exists name_ne text,
  add column if not exists description_ne text;

-- Appends the two Nepali columns; the existing four keep their positions.
create or replace view api.membership_tiers
with (security_invoker = true)
as
select key, name, description, annual_fee_cents, name_ne, description_ne
from membership.tiers
where active;

create view api.admin_membership_tiers
with (security_invoker = true)
as
select key, name, name_ne, description, description_ne, annual_fee_cents, active
from membership.tiers
order by annual_fee_cents, key;
grant select on api.admin_membership_tiers to authenticated;

create function api.save_membership_tier(p jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = membership, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('membership.tier.manage');
  v_key text := nullif(btrim(p ->> 'key'), '');
  v_fee int := (p ->> 'annual_fee_cents')::int;
  v_before jsonb;
begin
  if v_key is null or v_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'A tier needs a short key: lower case letters, numbers and dashes.'
      using errcode = '23514';
  end if;
  if nullif(btrim(p ->> 'name'), '') is null then
    raise exception 'A tier needs a name.' using errcode = '23514';
  end if;
  if v_fee is null or v_fee < 0 then
    raise exception 'A tier needs a yearly amount of zero or more.' using errcode = '23514';
  end if;
  if position(chr(8212) in p::text) > 0 then
    raise exception 'An em dash cannot be published. Rewrite the sentence without one.'
      using errcode = '23514';
  end if;

  select to_jsonb(t) into v_before from membership.tiers t where t.key = v_key;

  insert into membership.tiers (key, name, name_ne, description, description_ne, annual_fee_cents, active)
  values (
    v_key,
    btrim(p ->> 'name'),
    nullif(btrim(p ->> 'name_ne'), ''),
    nullif(btrim(p ->> 'description'), ''),
    nullif(btrim(p ->> 'description_ne'), ''),
    v_fee,
    coalesce((p ->> 'active')::boolean, true)
  )
  on conflict (key) do update set
    name = excluded.name,
    name_ne = excluded.name_ne,
    description = excluded.description,
    description_ne = excluded.description_ne,
    annual_fee_cents = excluded.annual_fee_cents,
    active = excluded.active;

  perform wall.audit(v_actor, 'membership.tier.save', 'membership', 'tiers', null, v_before, p);
  return v_key;
end;
$$;
revoke all on function api.save_membership_tier from public, anon;
grant execute on function api.save_membership_tier(jsonb) to authenticated;
