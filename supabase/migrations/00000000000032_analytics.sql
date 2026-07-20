-- 0032_analytics.sql
--
-- Analytics: per-role landing dashboards over data the system already
-- collects for its own operations (Build Readiness Review D-16;
-- Architecture Blueprint §7 "no vanity charts; every number must support
-- a decision someone actually makes").
--
-- Deliberately NOT here: analytics.events / a page-view beacon and its
-- nightly rollup. The original Architecture Blueprint sketched a
-- "first-party, cookieless" visitor-counting beacon for this domain --
-- but the PAZ Website & CMS spec that superseded the publishing domain's
-- design is explicit and unconditional on this point (Non-negotiable §2:
-- "No reader tracking... If any measurement is needed at all... the
-- default is none") and that requirement was verified satisfied for the
-- shipped frontend (Task 21). A reader-facing tracking beacon would
-- violate that regardless of how it's implemented, so it is not built.
-- Everything below is staff looking at data the system already has for
-- other reasons (registrations, applications, reservations, pledges) --
-- participation, not page views, per Blueprint §4.4's own framing.
--
-- Every function here is security definer with its own permission check
-- (not a security_invoker view over RLS'd tables) because a dashboard
-- needs aggregate counts across every row regardless of row-level
-- ownership -- an Editor's pipeline view must count every author's
-- drafts, not just their own, the same reason api.session_roster (0013)
-- and identity.display_name (0008) are security definer.

-- Permission keys and role grants live in supabase/seed/authz.sql (same
-- convention as every other domain -- docs/authz-matrix.md is diffed
-- against that file, not against migrations) and must be applied before
-- the functions below, since each one checks a permission this migration
-- doesn't itself insert.

-- ---------------------------------------------------------------------
-- analytics.editorial_pipeline() — Editor's landing dashboard
-- ---------------------------------------------------------------------
create function analytics.editorial_pipeline()
returns table (item_type publishing.item_type, status publishing.item_status, item_count bigint)
language plpgsql
stable
security definer
set search_path = publishing, authz, pg_temp
as $$
begin
  if not authz.has_staff_permission('analytics.dashboard.editorial') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select i.type, i.status, count(*)
    from publishing.items i
    where i.deleted_at is null
    group by i.type, i.status
    order by i.type, i.status;
end;
$$;

revoke all on function analytics.editorial_pipeline from public, anon;
grant execute on function analytics.editorial_pipeline to authenticated;

-- ---------------------------------------------------------------------
-- analytics.program_fill() — Program Manager's landing dashboard
-- ---------------------------------------------------------------------
create function analytics.program_fill()
returns table (
  session_id uuid,
  program_title text,
  starts_at timestamptz,
  capacity int,
  registered_count bigint,
  fill_pct numeric
)
language plpgsql
stable
security definer
set search_path = programs, authz, pg_temp
as $$
begin
  if not authz.has_staff_permission('analytics.dashboard.programs') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select
      s.id, p.title, s.starts_at, s.capacity,
      count(r.id) filter (where r.status = 'registered'),
      round(100.0 * count(r.id) filter (where r.status = 'registered') / s.capacity, 1)
    from programs.sessions s
    join programs.programs p on p.id = s.program_id
    left join programs.registrations r on r.session_id = s.id
    where s.status = 'scheduled' and s.starts_at > now()
    group by s.id, p.title, s.starts_at, s.capacity
    order by s.starts_at;
end;
$$;

revoke all on function analytics.program_fill from public, anon;
grant execute on function analytics.program_fill to authenticated;

-- ---------------------------------------------------------------------
-- analytics.membership_funnel() — Membership Manager's landing dashboard
-- ---------------------------------------------------------------------
create function analytics.membership_funnel()
returns table (metric text, metric_count bigint)
language plpgsql
stable
security definer
set search_path = membership, authz, pg_temp
as $$
begin
  if not authz.has_staff_permission('analytics.dashboard.membership') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select 'applications_pending', count(*) from membership.applications where status = 'pending'
    union all
    select 'applications_accepted_30d', count(*) from membership.applications
      where status = 'accepted' and decided_at > now() - interval '30 days'
    union all
    select 'applications_declined_30d', count(*) from membership.applications
      where status = 'declined' and decided_at > now() - interval '30 days'
    union all
    select 'members_active', count(*) from membership.members where status = 'active'
    union all
    select 'members_honorary', count(*) from membership.members where status = 'honorary'
    union all
    select 'members_lapsed', count(*) from membership.members where status = 'lapsed'
    union all
    select 'terms_unpaid', count(*) from membership.terms
      where paid_at is null and ends_on >= current_date;
end;
$$;

revoke all on function analytics.membership_funnel from public, anon;
grant execute on function analytics.membership_funnel to authenticated;

-- ---------------------------------------------------------------------
-- analytics.reservation_load() — Hospitality Manager's landing dashboard
-- ---------------------------------------------------------------------
create function analytics.reservation_load()
returns table (
  day date,
  requested bigint,
  confirmed bigint,
  seated bigint,
  completed bigint,
  cancelled bigint
)
language plpgsql
stable
security definer
set search_path = hospitality, authz, pg_temp
as $$
begin
  if not authz.has_staff_permission('analytics.dashboard.hospitality') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select
      r.starts_at::date,
      count(*) filter (where r.status = 'requested'),
      count(*) filter (where r.status = 'confirmed'),
      count(*) filter (where r.status = 'seated'),
      count(*) filter (where r.status = 'completed'),
      count(*) filter (where r.status = 'cancelled')
    from hospitality.reservations r
    where r.starts_at between now() and now() + interval '30 days'
    group by r.starts_at::date
    order by r.starts_at::date;
end;
$$;

revoke all on function analytics.reservation_load from public, anon;
grant execute on function analytics.reservation_load to authenticated;

-- ---------------------------------------------------------------------
-- analytics.finance_summary() — Finance's landing dashboard
-- ---------------------------------------------------------------------
create function analytics.finance_summary()
returns table (metric text, cents bigint)
language plpgsql
stable
security definer
set search_path = crm, membership, authz, pg_temp
as $$
begin
  if not authz.has_staff_permission('analytics.dashboard.finance') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select 'pledges_pledged_ytd', coalesce(sum(p.pledged_amount_cents), 0)::bigint
      from crm.pledges p where date_part('year', p.pledged_on) = date_part('year', current_date)
    union all
    select 'pledges_received_ytd', coalesce(sum(p.received_amount_cents), 0)::bigint
      from crm.pledges p where date_part('year', p.received_on) = date_part('year', current_date)
    union all
    select 'membership_terms_paid_ytd', coalesce(sum(t.amount_cents), 0)::bigint
      from membership.terms t where t.paid_at is not null and date_part('year', t.paid_at) = date_part('year', current_date)
    union all
    select 'membership_terms_unpaid', coalesce(sum(t.amount_cents), 0)::bigint
      from membership.terms t where t.paid_at is null and t.ends_on >= current_date;
end;
$$;

revoke all on function analytics.finance_summary from public, anon;
grant execute on function analytics.finance_summary to authenticated;

-- ---------------------------------------------------------------------
-- analytics.institution_vitals() — Administrator's cross-domain panel.
-- Aggregates only (D-16: "drilling into rows follows domain RLS" --
-- this function returns counts, never row data, so there is nothing to
-- drill into here regardless of the caller's per-domain access).
-- ---------------------------------------------------------------------
create function analytics.institution_vitals()
returns table (metric text, metric_count bigint)
language plpgsql
stable
security definer
set search_path = publishing, membership, programs, hospitality, crm, authz, pg_temp
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
    select 'upcoming_reservations', count(*) from hospitality.reservations
      where status in ('requested', 'confirmed') and starts_at > now()
    union all
    select 'organizations', count(*) from crm.organizations
    union all
    select 'active_relationships', count(*) from crm.relationships where status = 'active';
end;
$$;

revoke all on function analytics.institution_vitals from public, anon;
grant execute on function analytics.institution_vitals to authenticated;

-- ---------------------------------------------------------------------
-- Schema usage + api surface (thin wrappers, same shape as api.transition_item).
-- RETURNS TABLE doesn't register a reusable named type, so each wrapper
-- restates its source function's column list rather than "setof
-- analytics.foo" (which isn't valid -- foo is a function, not a type).
-- ---------------------------------------------------------------------
grant usage on schema analytics to authenticated;

create function api.editorial_pipeline()
returns table (item_type publishing.item_type, status publishing.item_status, item_count bigint)
language sql stable security invoker set search_path = analytics, pg_temp
as $$ select * from analytics.editorial_pipeline(); $$;
revoke all on function api.editorial_pipeline from public, anon;
grant execute on function api.editorial_pipeline to authenticated;

create function api.program_fill()
returns table (
  session_id uuid, program_title text, starts_at timestamptz,
  capacity int, registered_count bigint, fill_pct numeric
)
language sql stable security invoker set search_path = analytics, pg_temp
as $$ select * from analytics.program_fill(); $$;
revoke all on function api.program_fill from public, anon;
grant execute on function api.program_fill to authenticated;

create function api.membership_funnel()
returns table (metric text, metric_count bigint)
language sql stable security invoker set search_path = analytics, pg_temp
as $$ select * from analytics.membership_funnel(); $$;
revoke all on function api.membership_funnel from public, anon;
grant execute on function api.membership_funnel to authenticated;

create function api.reservation_load()
returns table (
  day date, requested bigint, confirmed bigint,
  seated bigint, completed bigint, cancelled bigint
)
language sql stable security invoker set search_path = analytics, pg_temp
as $$ select * from analytics.reservation_load(); $$;
revoke all on function api.reservation_load from public, anon;
grant execute on function api.reservation_load to authenticated;

create function api.finance_summary()
returns table (metric text, cents bigint)
language sql stable security invoker set search_path = analytics, pg_temp
as $$ select * from analytics.finance_summary(); $$;
revoke all on function api.finance_summary from public, anon;
grant execute on function api.finance_summary to authenticated;

create function api.institution_vitals()
returns table (metric text, metric_count bigint)
language sql stable security invoker set search_path = analytics, pg_temp
as $$ select * from analytics.institution_vitals(); $$;
revoke all on function api.institution_vitals from public, anon;
grant execute on function api.institution_vitals to authenticated;
