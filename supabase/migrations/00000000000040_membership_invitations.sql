-- 0040_membership_invitations.sql
--
-- Membership invitation tokens (D-12), the piece 0010_membership.sql
-- deliberately left absent: "the 'invited' intermediate state needs the
-- email-sending decision (T-067) to mean anything, so it's not modeled
-- until that exists." Both T-067 (ADR-11) and the 'invited' status
-- (0039) now exist.
--
-- Deliberately NOT here: rate limiting on accept_invitation (same known
-- gap as every public intake function in this repository, T-068-adjacent).

create table membership.invitations (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references membership.applications (id) on delete restrict,
  token_hash     text not null unique,
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now(),
  created_by     uuid references identity.people (id) on delete restrict
);
comment on table membership.invitations is
  'One row per application (unique application_id) -- re-issuing replaces '
  'the token in place rather than accumulating history, since only the '
  'current token is ever valid. Only token_hash is stored (sha256 via '
  'pgcrypto''s digest()); the raw token exists only in the moment it is '
  'generated (returned once to the caller) and in the email sent to the '
  'applicant -- a database dump can never be used to accept an '
  'invitation on someone''s behalf.';

create index invitations_expires_idx on membership.invitations (expires_at) where accepted_at is null;

alter table membership.invitations enable row level security;
grant select on membership.invitations to authenticated;
-- No direct DML grant: every write goes through the security-definer
-- functions below, so token generation/hashing can't be bypassed by a
-- direct insert.

create policy invitations_select_staff on membership.invitations
  for select to authenticated
  using ((select authz.has_staff_permission('membership.application.decide')));

-- ---------------------------------------------------------------------
-- membership.invite_applicant(application, actor) -- staff decision:
-- invite rather than accept/decline outright.
-- ---------------------------------------------------------------------
create function membership.invite_applicant(p_application uuid, p_actor uuid)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = membership, authz, extensions, pg_temp
as $$
declare
  v_app membership.applications;
  v_token text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  if p_actor is null or not authz.has_staff_permission('membership.application.decide') then
    raise exception 'Not permitted to decide applications' using errcode = '42501';
  end if;

  select * into v_app from membership.applications where id = p_application for update;
  if not found then
    raise exception 'Application % does not exist', p_application;
  end if;
  if v_app.status <> 'pending' then
    raise exception 'Application has already been decided (status: %)', v_app.status;
  end if;

  update membership.applications
  set status = 'invited', decided_at = now(), decided_by = p_actor
  where id = p_application;

  -- 32 random bytes, hex-encoded: no URL-encoding concerns in an email
  -- link, ~128 bits of entropy -- gen_random_bytes is pgcrypto's, not
  -- pg_catalog's gen_random_uuid(), so search_path must reach `extensions`
  -- (or wherever pgcrypto is installed) unlike the gen_random_uuid() calls
  -- elsewhere in this codebase.
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '14 days';

  insert into membership.invitations (application_id, token_hash, expires_at, created_by)
  values (p_application, encode(digest(v_token, 'sha256'), 'hex'), v_expires_at, p_actor)
  returning id into v_invitation_id;

  return query select v_invitation_id, v_token, v_expires_at;
end;
$$;
comment on function membership.invite_applicant(uuid, uuid) is
  'The only place a raw invitation token exists in plaintext -- the '
  'caller (invite-membership-applicant Edge Function) must use it '
  'immediately to send the acceptance email and never store it.';

revoke all on function membership.invite_applicant(uuid, uuid) from public, anon;
grant execute on function membership.invite_applicant(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- membership.reissue_invitation(application, actor) -- a fresh token for
-- an application still sitting in 'invited' (e.g. the original expired).
-- ---------------------------------------------------------------------
create function membership.reissue_invitation(p_application uuid, p_actor uuid)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = membership, authz, extensions, pg_temp
as $$
declare
  v_app membership.applications;
  v_token text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  if p_actor is null or not authz.has_staff_permission('membership.application.decide') then
    raise exception 'Not permitted to decide applications' using errcode = '42501';
  end if;

  select * into v_app from membership.applications where id = p_application for update;
  if not found then
    raise exception 'Application % does not exist', p_application;
  end if;
  if v_app.status <> 'invited' then
    raise exception 'Application is not awaiting invitation acceptance (status: %)', v_app.status;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '14 days';

  update membership.invitations
  set token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      expires_at = v_expires_at,
      accepted_at = null,
      created_by = p_actor,
      created_at = now()
  where application_id = p_application
  returning id into v_invitation_id;

  if not found then
    raise exception 'No invitation exists for application % -- use invite_applicant() first', p_application;
  end if;

  return query select v_invitation_id, v_token, v_expires_at;
end;
$$;

revoke all on function membership.reissue_invitation(uuid, uuid) from public, anon;
grant execute on function membership.reissue_invitation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- membership.accept_invitation(token) -- public: whoever holds the raw
-- token, no account or staff permission needed. Mirrors decide_application's
-- accepted-path member/term creation (0010) rather than duplicating a
-- second copy of that logic with its own bugs to diverge over time --
-- small enough here to inline directly instead of factoring out a shared
-- helper for a single call site on each side.
-- ---------------------------------------------------------------------
create function membership.accept_invitation(p_token text)
returns text  -- the new member_no, not the full row (api.decide_membership_application's
              -- "return the narrow thing, not the row" precedent -- an anonymous
              -- token-bearer gets a confirmation, not an internal record shape)
language plpgsql
security definer
set search_path = membership, authz, extensions, pg_temp
as $$
declare
  v_invitation membership.invitations;
  v_app membership.applications;
  v_fee int;
  v_member_id uuid;
  v_member_no text;
begin
  select * into v_invitation
  from membership.invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invitation not found' using errcode = '42501';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'This invitation has already been accepted';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'This invitation has expired -- ask the membership team to re-issue it';
  end if;

  select * into v_app from membership.applications where id = v_invitation.application_id for update;
  if v_app.status <> 'invited' then
    raise exception 'Application is not awaiting invitation acceptance (status: %)', v_app.status;
  end if;

  select annual_fee_cents into v_fee from membership.tiers where key = v_app.tier_key;

  insert into membership.members (person_id, member_no, tier_key, joined_on)
  values (v_app.person_id, membership.next_member_no(), v_app.tier_key, current_date)
  on conflict (person_id) do update
    set status = 'active', tier_key = excluded.tier_key
  returning id into v_member_id;

  insert into membership.terms (member_id, tier_key, starts_on, ends_on, amount_cents, recorded_by)
  values (
    v_member_id, v_app.tier_key, current_date,
    (current_date + interval '1 year')::date, coalesce(v_fee, 0), null
  );

  update membership.applications set status = 'accepted' where id = v_app.id;
  update membership.invitations set accepted_at = now() where id = v_invitation.id;

  select member_no into v_member_no from membership.members where id = v_member_id;
  return v_member_no;
end;
$$;
comment on function membership.accept_invitation(text) is
  'terms.recorded_by is null here (D-12: "payment recorded when it '
  'arrives" -- acceptance creates an unpaid term; a staff member records '
  'the actual payment later via record_payment(), which is the point '
  'recorded_by gets set, same as any other unpaid term).';

revoke all on function membership.accept_invitation(text) from public, anon, authenticated;
-- No grant to anyone: api.accept_membership_invitation below is
-- SECURITY DEFINER (unlike the staff-context wrappers elsewhere in this
-- file, which are SECURITY INVOKER because they need the caller's own
-- authz context preserved) -- it runs as its owner, the same role that
-- owns this function too, so ownership alone is enough to call it. The
-- alternative -- granting anon direct execute here -- would let anyone
-- with the anon key call it bypassing the api wrapper's naming/
-- versioning discipline (ADR-32) for no benefit.

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------
create function api.invite_membership_application(p_application uuid)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language sql
volatile
security invoker
set search_path = membership, authz, pg_temp
as $$
  select * from membership.invite_applicant(p_application, (select authz.current_person_id()));
$$;

revoke all on function api.invite_membership_application from public, anon;
grant execute on function api.invite_membership_application to authenticated;

create function api.reissue_membership_invitation(p_application uuid)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language sql
volatile
security invoker
set search_path = membership, authz, pg_temp
as $$
  select * from membership.reissue_invitation(p_application, (select authz.current_person_id()));
$$;

revoke all on function api.reissue_membership_invitation from public, anon;
grant execute on function api.reissue_membership_invitation to authenticated;

-- Public: whoever holds the raw token. SECURITY DEFINER (not invoker,
-- unlike the two staff wrappers above) -- there is no caller authz
-- context to preserve here, the token itself is the entire credential,
-- and ownership is what lets this call membership.accept_invitation
-- despite that function granting execute to nobody (see its own comment).
create function api.accept_membership_invitation(p_token text)
returns text
language sql
volatile
security definer
set search_path = membership, pg_temp
as $$
  select membership.accept_invitation(p_token);
$$;

revoke all on function api.accept_membership_invitation from public;
grant execute on function api.accept_membership_invitation to anon, authenticated;
