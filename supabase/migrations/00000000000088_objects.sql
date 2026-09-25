-- 0088_objects.sql
--
-- What the house sells as objects (docs/website-additions.md K1): the Papers
-- and the Pigeon Post as printed objects, and prints. No checkout. A sale
-- stays a conversation: each object carries an enquiry, answered at the desk.
-- Nothing is shown until the house publishes an object, and the page stands
-- empty until then. Prices are shown only when the house sets one.

create table publishing.objects (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind              text not null default 'print' check (kind in ('paper', 'pigeon_post', 'print', 'other')),
  title             text not null check (btrim(title) <> ''),
  title_ne          text,
  description       text,
  description_ne    text,
  price_minor       bigint check (price_minor is null or price_minor >= 0),
  currency          text not null default 'NPR',
  sort              int not null default 0,
  published         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger objects_set_updated_at before update on publishing.objects
  for each row execute function public.set_updated_at();
create trigger objects_reject_em_dash before insert or update on publishing.objects
  for each row when (new.published) execute function publishing.reject_em_dash();

alter table publishing.objects enable row level security;
grant select on publishing.objects to authenticated;
create policy objects_select_staff on publishing.objects
  for select to authenticated using ((select authz.has_staff_permission('publishing.item.read')));

create view api.objects with (security_invoker = false) as
select o.id, o.slug, o.kind, o.title, o.title_ne, o.description, o.description_ne,
       o.price_minor, o.currency
from publishing.objects o
where o.published
order by o.sort, o.title;
grant select on api.objects to anon, authenticated;

create view api.admin_objects with (security_invoker = true) as
select * from publishing.objects order by sort, title;
grant select on api.admin_objects to authenticated;

create function api.save_object(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = publishing, wall, authz, admin, pg_temp
as $$
declare
  v_actor uuid := wall.require('publishing.item.update');
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_before jsonb;
begin
  select to_jsonb(o) into v_before from publishing.objects o where o.id = v_id;
  insert into publishing.objects
    (id, slug, kind, title, title_ne, description, description_ne, price_minor, currency, sort, published)
  values (v_id, btrim(p ->> 'slug'), coalesce(nullif(p ->> 'kind', ''), 'print'), btrim(p ->> 'title'),
    nullif(btrim(p ->> 'title_ne'), ''), nullif(btrim(p ->> 'description'), ''),
    nullif(btrim(p ->> 'description_ne'), ''), nullif(p ->> 'price_minor', '')::bigint,
    coalesce(nullif(p ->> 'currency', ''), 'NPR'), coalesce((p ->> 'sort')::int, 0),
    coalesce((p ->> 'published')::boolean, false))
  on conflict (id) do update set
    slug = excluded.slug, kind = excluded.kind, title = excluded.title, title_ne = excluded.title_ne,
    description = excluded.description, description_ne = excluded.description_ne,
    price_minor = excluded.price_minor, currency = excluded.currency, sort = excluded.sort,
    published = excluded.published;
  perform wall.audit(v_actor, 'publishing.object.save', 'publishing', 'objects', v_id, v_before, p);
  return v_id;
end;
$$;
revoke all on function api.save_object(jsonb) from public, anon;
grant execute on function api.save_object(jsonb) to authenticated;
