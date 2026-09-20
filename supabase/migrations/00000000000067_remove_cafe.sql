-- 0067_remove_cafe.sql
--
-- PAZ Site Build Specification section 5: there is no cafe, and nothing on
-- the site may describe a room the house does not have. This removes the
-- whole hospitality domain (menus, service periods, tables, reservations)
-- together with every api surface and permission that served it.
--
-- Nothing was lost: on the day this was written the live project held zero
-- rows in hospitality.menus, menu_sections, menu_items, service_periods,
-- tables and reservations, so there was nothing to export first. Anything
-- that had been entered would have had to be exported before this ran.
--
-- desk_items (the editorial desk) and programs.venues are different
-- things and are untouched.

-- ---------------------------------------------------------------------
-- The api surface.
-- ---------------------------------------------------------------------
drop view if exists api.public_menu;
drop view if exists api.service_periods;
drop view if exists api.my_reservations;
drop view if exists api.desk_reservations;
drop view if exists api.tables;
drop view if exists api.admin_menu_items;
drop view if exists api.admin_menu_sections;
drop view if exists api.admin_menus;

drop function if exists api.request_reservation;
drop function if exists api.cancel_my_reservation;
drop function if exists api.set_reservation_status;
drop function if exists api.save_table;
drop function if exists api.save_menu;
drop function if exists api.save_menu_section;
drop function if exists api.save_menu_item;
drop function if exists api.reservation_load;
drop function if exists analytics.reservation_load;

-- ---------------------------------------------------------------------
-- Cross-domain functions that read hospitality.reservations are
-- redefined without it (create or replace is safe here: the return
-- shapes do not change).
-- ---------------------------------------------------------------------
create or replace function analytics.institution_vitals()
returns table (metric text, metric_count bigint)
language plpgsql
stable
security definer
set search_path = publishing, membership, programs, crm, authz, pg_temp
as $$
begin
  if not authz.has_staff_permission('analytics.dashboard.vitals') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select 'published_items', count(*) from publishing.items where status = 'published'
    union all
    select 'active_members', count(*) from membership.members where status in ('active', 'honorary')
    union all
    select 'upcoming_sessions', count(*) from programs.sessions
      where status = 'scheduled' and starts_at > now()
    union all
    select 'organizations', count(*) from crm.organizations
    union all
    select 'active_relationships', count(*) from crm.relationships where status = 'active';
end;
$$;

create or replace function api.person_timeline(p_person uuid)
returns table (
  occurred_at timestamptz,
  kind text,
  summary text
)
language sql
stable
security invoker
set search_path = crm, membership, programs, pg_temp
as $$
  select occurred_at, kind, summary from (
    select i.occurred_at, 'interaction'::text as kind, i.summary
    from crm.interactions i
    join crm.relationships r on r.id = i.relationship_id
    where r.person_id = p_person

    union all
    select r.started_on::timestamptz, 'relationship_started'::text,
      'Relationship started: ' || r.kind
    from crm.relationships r
    where r.person_id = p_person

    union all
    select r.ended_on::timestamptz, 'relationship_ended'::text,
      'Relationship ended: ' || r.kind
    from crm.relationships r
    where r.person_id = p_person and r.ended_on is not null

    union all
    select p.pledged_on::timestamptz, 'pledge'::text,
      'Pledge recorded: $' || to_char(p.pledged_amount_cents::numeric / 100, 'FM999999990.00')
    from crm.pledges p
    join crm.relationships r on r.id = p.relationship_id
    where r.person_id = p_person

    union all
    select a.submitted_at, 'membership_application'::text,
      'Applied for membership (' || a.tier_key || ')'
    from membership.applications a
    where a.person_id = p_person

    union all
    select t.created_at, 'membership_term'::text,
      'Membership term recorded (' || t.tier_key || ')'
    from membership.terms t
    join membership.members m on m.id = t.member_id
    where m.person_id = p_person

    union all
    select r.registered_at, 'program_registration'::text,
      'Registered for a programme session'
    from programs.registrations r
    where r.person_id = p_person
  ) events
  order by occurred_at desc;
$$;

-- ---------------------------------------------------------------------
-- The hospitality domain itself. Tables, the reservation functions, the
-- reservation_status enum and the reservation_span helper all live in
-- this schema, so dropping it removes them together.
-- ---------------------------------------------------------------------
drop schema if exists hospitality cascade;

-- ---------------------------------------------------------------------
-- Permissions and the role that only existed for this domain.
-- role_permissions rows go with them (on delete cascade). The role is
-- removed only when nobody holds it; otherwise it is left in place with
-- no permissions, so this migration can never fail on live assignments.
-- ---------------------------------------------------------------------
delete from authz.permissions
where key like 'hospitality.%' or key = 'analytics.dashboard.hospitality';

do $$
begin
  if not exists (select 1 from authz.user_roles where role_key = 'hospitality_manager') then
    delete from authz.roles where key = 'hospitality_manager';
  end if;
end;
$$;
