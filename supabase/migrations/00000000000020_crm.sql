-- 0020_crm.sql
--
-- CRM: institutional relationships (Build Readiness Review [11] in the
-- dependency graph — depends on identity; enriches the person timeline).
-- No public surface at all: every table and function here is staff-only,
-- so this domain adds nothing to the public bundle.
--
-- Deliberately NOT here (absent, not stubbed):
-- - api.person_timeline (D-14, a view unioning events across every domain
--   tagged by the permission needed to see each row category) — belongs
--   with whichever migration lands last among the domains it unions, not
--   here; adding it now would mean revisiting it on every subsequent
--   migration anyway.
-- - The 24h self-edit window on interactions (D-14 allows authors to
--   correct their own interaction within 24h). v1 is fully append-only:
--   corrections happen by a follow-up interaction row, which is D-14's own
--   fallback behavior and needs no extra schema support to work.
-- - A dedicated CRM role. The architecture doc never defines one;
--   membership_manager (donor/institutional relationships overlap
--   naturally with membership) and finance (pledge recording, matching
--   their existing "financial views + payment recording, no content
--   access" scope) cover it without inventing a role nothing else needs
--   yet.

create type crm.relationship_status as enum ('active', 'ended');

-- ---------------------------------------------------------------------
-- crm.organizations
-- ---------------------------------------------------------------------
create table crm.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on crm.organizations
  for each row execute function public.set_updated_at();

create trigger organizations_audit
  after insert or update or delete on crm.organizations
  for each row execute function public.audit_row_change('crm.organization.changed');

alter table crm.organizations enable row level security;
grant select on crm.organizations to authenticated;
grant insert, update on crm.organizations to authenticated;

create policy organizations_select_staff on crm.organizations
  for select to authenticated
  using ((select authz.has_staff_permission('crm.organization.read')));

create policy organizations_manage_staff on crm.organizations
  for all to authenticated
  using ((select authz.has_staff_permission('crm.organization.manage')))
  with check ((select authz.has_staff_permission('crm.organization.manage')));

-- ---------------------------------------------------------------------
-- crm.org_people — who's affiliated with which organization
-- ---------------------------------------------------------------------
create table crm.org_people (
  org_id    uuid not null references crm.organizations (id) on delete cascade,
  person_id uuid not null references identity.people (id) on delete cascade,
  role      text,
  primary key (org_id, person_id)
);

alter table crm.org_people enable row level security;
grant select on crm.org_people to authenticated;
grant insert, update, delete on crm.org_people to authenticated;

create policy org_people_select_staff on crm.org_people
  for select to authenticated
  using ((select authz.has_staff_permission('crm.organization.read')));

create policy org_people_manage_staff on crm.org_people
  for all to authenticated
  using ((select authz.has_staff_permission('crm.organization.manage')))
  with check ((select authz.has_staff_permission('crm.organization.manage')));

-- ---------------------------------------------------------------------
-- crm.relationships — with a person or an organization, never both
-- ---------------------------------------------------------------------
create table crm.relationships (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid references identity.people (id) on delete restrict,
  org_id        uuid references crm.organizations (id) on delete restrict,
  kind          text not null,
  status        crm.relationship_status not null default 'active',
  owner_person  uuid references identity.people (id) on delete restrict,
  started_on    date not null default current_date,
  ended_on      date,
  superseded_by uuid references crm.relationships (id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint relationships_one_subject check (
    (person_id is not null and org_id is null) or (person_id is null and org_id is not null)
  )
);
comment on column crm.relationships.superseded_by is
  'A renegotiated relationship (D-5) gets a new row; the old one is ended '
  'and points here rather than being edited in place — the terms that were '
  'actually agreed at the time stay intact.';

create index relationships_person_idx on crm.relationships (person_id) where person_id is not null;
create index relationships_org_idx on crm.relationships (org_id) where org_id is not null;
create index relationships_kind_status_idx on crm.relationships (kind, status);
create index relationships_owner_idx on crm.relationships (owner_person);

create trigger relationships_set_updated_at
  before update on crm.relationships
  for each row execute function public.set_updated_at();

create trigger relationships_audit
  after insert or update or delete on crm.relationships
  for each row execute function public.audit_row_change('crm.relationship.changed');

alter table crm.relationships enable row level security;
grant select on crm.relationships to authenticated;
grant insert, update on crm.relationships to authenticated;

create policy relationships_select_staff on crm.relationships
  for select to authenticated
  using ((select authz.has_staff_permission('crm.relationship.read')));

create policy relationships_manage_staff on crm.relationships
  for all to authenticated
  using ((select authz.has_staff_permission('crm.relationship.manage')))
  with check ((select authz.has_staff_permission('crm.relationship.manage')));

-- ---------------------------------------------------------------------
-- crm.interactions — append-only (D-14: corrections are a follow-up row)
-- ---------------------------------------------------------------------
create table crm.interactions (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references crm.relationships (id) on delete restrict,
  occurred_at     timestamptz not null default now(),
  summary         text not null,
  created_by      uuid references identity.people (id) on delete restrict,
  created_at      timestamptz not null default now()
);

create index interactions_relationship_idx on crm.interactions (relationship_id, occurred_at desc);

alter table crm.interactions enable row level security;
grant select on crm.interactions to authenticated;
grant insert on crm.interactions to authenticated;
-- No update/delete grant to anyone, including staff — append-only by
-- design (D-14), enforced at the grant level, not just by convention.

create policy interactions_select_staff on crm.interactions
  for select to authenticated
  using ((select authz.has_staff_permission('crm.relationship.read')));

create policy interactions_insert_staff on crm.interactions
  for insert to authenticated
  with check (
    created_by = (select authz.current_person_id())
    and (select authz.has_staff_permission('crm.interaction.create'))
  );

create trigger interactions_audit
  after insert on crm.interactions
  for each row execute function public.audit_row_change('crm.interaction.logged');

-- ---------------------------------------------------------------------
-- crm.pledges (D-15)
-- ---------------------------------------------------------------------
create table crm.pledges (
  id                   uuid primary key default gen_random_uuid(),
  relationship_id      uuid not null references crm.relationships (id) on delete restrict,
  pledged_amount_cents int not null check (pledged_amount_cents >= 0),
  pledged_on           date not null default current_date,
  received_amount_cents int check (received_amount_cents is null or received_amount_cents >= 0),
  received_on          date,
  acknowledged_at      timestamptz,
  acknowledged_by      uuid references identity.people (id) on delete restrict,
  anonymous            boolean not null default false,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on column crm.pledges.anonymous is
  'Donor known internally, never surfaced in any public/aggregate view '
  '(D-15) — there is no public donor-facing view in this schema at all, '
  'but the flag exists now so it is never lost if one is ever built.';

create index pledges_relationship_idx on crm.pledges (relationship_id);
create index pledges_unacknowledged_idx on crm.pledges (received_on) where acknowledged_at is null and received_on is not null;

create trigger pledges_set_updated_at
  before update on crm.pledges
  for each row execute function public.set_updated_at();

create trigger pledges_audit
  after insert or update or delete on crm.pledges
  for each row execute function public.audit_row_change('crm.pledge.changed');

alter table crm.pledges enable row level security;
grant select on crm.pledges to authenticated;
grant insert, update on crm.pledges to authenticated;

create policy pledges_select_staff on crm.pledges
  for select to authenticated
  using ((select authz.has_staff_permission('crm.pledge.read')));

create policy pledges_manage_staff on crm.pledges
  for all to authenticated
  using ((select authz.has_staff_permission('crm.pledge.manage')))
  with check ((select authz.has_staff_permission('crm.pledge.manage')));

-- ---------------------------------------------------------------------
-- Schema usage
-- ---------------------------------------------------------------------
grant usage on schema crm to authenticated;

-- ---------------------------------------------------------------------
-- api surface — entirely staff-only, no anon grants anywhere in this file
-- ---------------------------------------------------------------------

create view api.organizations
with (security_invoker = true)
as
select id, name, kind, notes, created_at from crm.organizations;

grant select on api.organizations to authenticated;

create function api.save_organization(p_id uuid, p_name text, p_kind text, p_notes text)
returns uuid
language plpgsql
security invoker
set search_path = crm, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into crm.organizations (name, kind, notes) values (p_name, p_kind, p_notes)
    returning id into v_id;
  else
    update crm.organizations set name = p_name, kind = p_kind, notes = p_notes
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_organization from public, anon;
grant execute on function api.save_organization to authenticated;

-- Relationship rows shaped for the admin UI: the subject is either a
-- person (via identity.display_name, same narrow-accessor pattern used
-- throughout — never a direct identity.people join) or an organization.
create view api.relationships
with (security_invoker = true)
as
select
  r.id, r.kind, r.status, r.started_on, r.ended_on, r.superseded_by, r.notes,
  r.person_id, r.org_id,
  coalesce(identity.display_name(r.person_id), o.name) as subject_name,
  identity.display_name(r.owner_person) as owner_name
from crm.relationships r
left join crm.organizations o on o.id = r.org_id;

grant select on api.relationships to authenticated;

create function api.save_relationship(
  p_id uuid,
  p_person_id uuid,
  p_org_id uuid,
  p_kind text,
  p_owner_person uuid,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = crm, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into crm.relationships (person_id, org_id, kind, owner_person, notes)
    values (p_person_id, p_org_id, p_kind, p_owner_person, p_notes)
    returning id into v_id;
  else
    update crm.relationships
    set kind = p_kind, owner_person = p_owner_person, notes = p_notes
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_relationship from public, anon;
grant execute on function api.save_relationship to authenticated;

create function api.end_relationship(p_id uuid, p_superseded_by uuid default null)
returns void
language sql
volatile
security invoker
set search_path = crm, pg_temp
as $$
  update crm.relationships
  set status = 'ended', ended_on = current_date, superseded_by = p_superseded_by
  where id = p_id;
$$;

revoke all on function api.end_relationship from public, anon;
grant execute on function api.end_relationship to authenticated;

create view api.interactions
with (security_invoker = true)
as
select
  i.id, i.relationship_id, i.occurred_at, i.summary, i.created_at,
  identity.display_name(i.created_by) as created_by_name
from crm.interactions i;

grant select on api.interactions to authenticated;

create function api.log_interaction(p_relationship_id uuid, p_summary text, p_occurred_at timestamptz default now())
returns uuid
language sql
volatile
security invoker
set search_path = crm, authz, pg_temp
as $$
  insert into crm.interactions (relationship_id, summary, occurred_at, created_by)
  values (p_relationship_id, p_summary, coalesce(p_occurred_at, now()), (select authz.current_person_id()))
  returning id;
$$;

revoke all on function api.log_interaction from public, anon;
grant execute on function api.log_interaction to authenticated;

create view api.pledges
with (security_invoker = true)
as
select
  p.id, p.relationship_id, p.pledged_amount_cents, p.pledged_on,
  p.received_amount_cents, p.received_on, p.acknowledged_at, p.anonymous, p.notes,
  coalesce(identity.display_name(r.person_id), o.name) as subject_name
from crm.pledges p
join crm.relationships r on r.id = p.relationship_id
left join crm.organizations o on o.id = r.org_id;

grant select on api.pledges to authenticated;

create function api.save_pledge(
  p_id uuid,
  p_relationship_id uuid,
  p_pledged_amount_cents int,
  p_notes text,
  p_anonymous boolean
)
returns uuid
language plpgsql
security invoker
set search_path = crm, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into crm.pledges (relationship_id, pledged_amount_cents, notes, anonymous)
    values (p_relationship_id, p_pledged_amount_cents, p_notes, coalesce(p_anonymous, false))
    returning id into v_id;
  else
    update crm.pledges
    set pledged_amount_cents = p_pledged_amount_cents, notes = p_notes,
        anonymous = coalesce(p_anonymous, anonymous)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function api.save_pledge from public, anon;
grant execute on function api.save_pledge to authenticated;

create function api.record_pledge_receipt(p_id uuid, p_received_amount_cents int)
returns void
language sql
volatile
security invoker
set search_path = crm, pg_temp
as $$
  update crm.pledges
  set received_amount_cents = p_received_amount_cents, received_on = current_date
  where id = p_id;
$$;

revoke all on function api.record_pledge_receipt from public, anon;
grant execute on function api.record_pledge_receipt to authenticated;

create function api.acknowledge_pledge(p_id uuid)
returns void
language sql
volatile
security invoker
set search_path = crm, authz, pg_temp
as $$
  update crm.pledges
  set acknowledged_at = now(), acknowledged_by = (select authz.current_person_id())
  where id = p_id;
$$;

revoke all on function api.acknowledge_pledge from public, anon;
grant execute on function api.acknowledge_pledge to authenticated;
