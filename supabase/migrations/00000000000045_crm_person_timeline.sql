-- 0045_crm_person_timeline.sql
--
-- T-095/D-14: 0020_crm.sql's own header deferred this explicitly --
-- "belongs with whichever migration lands last among the domains it
-- unions, not here; adding it now would mean revisiting it on every
-- subsequent migration anyway." Every domain it unions (identity,
-- membership, programs, hospitality, crm itself) now exists, so this is
-- that last migration.
--
-- security invoker, deliberately: each branch below is a plain select
-- against a table that already has its own staff-only RLS policy
-- (crm.interactions/relationships/pledges, membership.applications/
-- terms, programs.registrations, hospitality.reservations -- every one
-- gated by authz.has_staff_permission on its own domain-specific
-- permission key). A caller lacking a given permission simply sees zero
-- rows from that branch, not an error -- exactly D-14's "each row
-- category filtered by the permission needed to see it," achieved by
-- relying on RLS rather than duplicating a parallel set of permission
-- checks in this function that could drift from the tables' own
-- policies.
create function api.person_timeline(p_person uuid)
returns table (
  occurred_at timestamptz,
  kind text,
  summary text
)
language sql
stable
security invoker
set search_path = crm, membership, programs, hospitality, pg_temp
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

    union all
    select r.created_at, 'reservation'::text,
      'Reservation requested for ' || r.party_size || ' (' || r.status || ')'
    from hospitality.reservations r
    where r.person_id = p_person
  ) events
  order by occurred_at desc;
$$;

comment on function api.person_timeline(uuid) is
  'D-14: a person''s full institutional history, unioned across every '
  'domain that references identity.people. security invoker -- see the '
  'function-level comment above for why no explicit permission check is '
  'duplicated here.';

revoke all on function api.person_timeline(uuid) from public, anon;
grant execute on function api.person_timeline(uuid) to authenticated;
