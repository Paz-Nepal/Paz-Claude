-- 0042_membership_digital_card.sql
--
-- T-083: "Digital card: issue + verify Edge Fns + member card page."
-- 0001_foundation.sql's schema comment on `membership` already names
-- "digital card" as part of this domain; this is the first migration to
-- actually build it.
--
-- Design: no separate "card" table -- a card is just membership.members
-- plus a verification secret. Verification is by opaque token, not by
-- member_no: member_no is a small sequential counter (membership.
-- next_member_no(), 0010) and would be trivially enumerable if it alone
-- were enough to look up a member's status, so a member's card carries a
-- second, unguessable value instead. Hashed at rest, same pattern as
-- membership.invitations.token_hash (ADR-26) -- a database dump can never
-- be used to forge a valid-looking card.
alter table membership.members
  add column card_token_hash text unique,
  add column card_issued_at timestamptz;

comment on column membership.members.card_token_hash is
  'sha256 hex digest of the current card verification code. Null until '
  'the member issues their first card. Reissuing (api.issue_my_card, '
  'called again) overwrites this, immediately invalidating the prior '
  'code -- there is deliberately no history of past codes, matching '
  'membership.invitations'' "one row, replaced in place" precedent.';

-- ---------------------------------------------------------------------
-- api.my_membership -- the signed-in person's own membership record, if
-- any. Explicitly filtered by person_id (not left to members_select_self
-- alone) -- RLS policies are OR'd, so a staff member who also happens to
-- be a member would otherwise see every row members_select_staff allows
-- through this same security_invoker view, not just their own. Same
-- reasoning as api.my_profile's explicit auth.uid() filter (0005).
-- ---------------------------------------------------------------------
create view api.my_membership
with (security_invoker = true)
as
select
  m.id, m.member_no, m.tier_key, t.name as tier_name, m.status,
  m.joined_on, m.card_issued_at
from membership.members m
join membership.tiers t on t.key = m.tier_key
where m.person_id = (select authz.current_person_id());

comment on view api.my_membership is
  'The signed-in person''s own membership record. At most one row, '
  'always -- see the person_id filter above for why that holds even for '
  'staff. The card page reads this for tier/status/joined_on; the '
  'verification code itself is never exposed here, only by '
  'api.issue_my_card() at the moment it is (re)issued.';

grant select on api.my_membership to authenticated;

-- ---------------------------------------------------------------------
-- api.issue_my_card -- self-service. security definer: authenticated has
-- no UPDATE grant on membership.members (0010's comment: "created only by
-- decide_application(), status changed only by set_member_status()"),
-- same reason api.update_my_directory_opt_in is security definer despite
-- its own comment saying otherwise (that comment is stale -- the code
-- has always been security definer, checked directly rather than trusted
-- here).
-- ---------------------------------------------------------------------
create function api.issue_my_card()
returns table (member_no text, token text, issued_at timestamptz)
language plpgsql
security definer
set search_path = membership, authz, extensions, pg_temp
as $$
declare
  v_member_id uuid;
  v_member_no text;
  v_status membership.member_status;
  v_token text;
  v_issued_at timestamptz;
begin
  select id, member_no, status into v_member_id, v_member_no, v_status
  from membership.members
  where person_id = (select authz.current_person_id());

  if not found then
    raise exception 'No membership found for the signed-in person' using errcode = '42501';
  end if;

  if v_status not in ('active', 'honorary') then
    raise exception 'Only active or honorary members can issue a digital card' using errcode = '42501';
  end if;

  -- 6 bytes / 12 hex chars: short enough for a member to read aloud or
  -- retype if a scanner isn't available, ~48 bits of entropy -- adequate
  -- given verification itself is staff-authenticated (aal2 via
  -- membership.member.read), not a public, brute-forceable endpoint.
  v_token := encode(gen_random_bytes(6), 'hex');
  v_issued_at := now();

  update membership.members
  set card_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      card_issued_at = v_issued_at
  where id = v_member_id;

  return query select v_member_no, v_token, v_issued_at;
end;
$$;

comment on function api.issue_my_card() is
  'Generates (or rotates) the signed-in member''s card verification '
  'code. The raw code is returned exactly once, here, for the card page '
  'to display/encode -- it is never stored or returned again afterward, '
  'same handling as an invitation token (ADR-26).';

revoke all on function api.issue_my_card from public, anon;
grant execute on function api.issue_my_card to authenticated;

-- ---------------------------------------------------------------------
-- api.verify_member_card -- staff tool (front desk / hospitality
-- scanning a card). security invoker: membership.members' own
-- `members_select_staff` policy (authz.has_staff_permission
-- ('membership.member.read'), which already requires aal2) is the entire
-- authorization here -- no new permission key needed. A non-staff
-- authenticated caller gets zero rows (members_select_self only ever
-- shows their own row, and looking up someone else's card by token can
-- never match their own id), not an error -- same "empty, not denied"
-- shape as every other RLS-scoped read in this codebase.
-- ---------------------------------------------------------------------
create function api.verify_member_card(p_token text)
returns table (
  member_no text,
  member_name text,
  tier_name text,
  status membership.member_status,
  valid boolean
)
language sql
stable
security invoker
set search_path = membership, identity, extensions, pg_temp
as $$
  select
    m.member_no,
    identity.display_name(m.person_id),
    t.name,
    m.status,
    m.status in ('active', 'honorary')
  from membership.members m
  join membership.tiers t on t.key = m.tier_key
  where m.card_token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

comment on function api.verify_member_card(text) is
  '`valid` reflects live status (active/honorary), not whether the code '
  'itself is well-formed -- a recognized-but-lapsed member''s card '
  'verifies successfully (member_no/name/status are returned) with '
  'valid = false, so staff sees who it belongs to rather than a bare '
  'rejection.';

revoke all on function api.verify_member_card from public, anon;
grant execute on function api.verify_member_card to authenticated;
