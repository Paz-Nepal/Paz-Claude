-- 0038_membership_renewal_notices.sql
--
-- Renewal notice tracking (D-11): "T-30 days: renewal notice email...
-- one reminder at T-7, none after." 0010_membership.sql deliberately left
-- this absent pending two things that now both exist: an email provider
-- (ADR-11) and a scheduled-job pattern (.github/workflows/
-- nightly-backup-export.yml). The send-renewal-notices Edge Function
-- (this migration's companion) does the sending; these two columns are
-- what make each notice a true one-time send rather than "whenever the
-- job happens to run" -- a missed cron run still catches up on the next
-- one, and an already-notified term is never notified twice.

alter table membership.terms
  add column renewal_notice_30d_sent_at timestamptz,
  add column renewal_notice_7d_sent_at timestamptz;

comment on column membership.terms.renewal_notice_30d_sent_at is
  'Set by send-renewal-notices the first time this term''s T-30 notice '
  'goes out. Null means not sent yet -- the idempotency guard, not just '
  'a log entry (admin.audit_log records the send itself separately).';
comment on column membership.terms.renewal_notice_7d_sent_at is
  'Same as renewal_notice_30d_sent_at, for the single T-7 reminder '
  '(D-11: "one reminder at T-7, none after").';

-- Scan index for the job: unpaid-lookahead already exists
-- (terms_unpaid_idx); this is the equivalent for the renewal-notice scan,
-- which looks at ends_on regardless of paid_at.
create index terms_renewal_scan_idx on membership.terms (ends_on)
  where renewal_notice_30d_sent_at is null or renewal_notice_7d_sent_at is null;

-- ---------------------------------------------------------------------
-- api.terms_due_for_renewal_notice() -- what the Edge Function reads.
-- service_role only: this is system-job data (member email address
-- alongside their term), not something any authenticated person should
-- be able to enumerate, staff included -- staff already have
-- membership.terms via members_select_staff/terms_select_staff for
-- individual lookups.
-- ---------------------------------------------------------------------
create function api.terms_due_for_renewal_notice()
returns table (
  term_id uuid,
  member_id uuid,
  full_name text,
  email citext,
  tier_name text,
  ends_on date,
  notice_kind text
)
language sql
stable
security definer
set search_path = membership, identity, authz, pg_temp
as $$
  select
    t.id, t.member_id, identity.display_name(m.person_id), p.email,
    tr.name, t.ends_on, '30d'
  from membership.terms t
  join membership.members m on m.id = t.member_id
  join identity.people p on p.id = m.person_id
  join membership.tiers tr on tr.key = t.tier_key
  where m.status = 'active'
    and t.ends_on > current_date
    and t.ends_on <= current_date + 30
    and t.renewal_notice_30d_sent_at is null
    -- Only the member's most recent term -- otherwise a member who has
    -- already renewed (a later term row now exists) would still get a
    -- notice off their old, now-superseded term as its end date
    -- approaches. "Most recent" is by ends_on, not created_at: renewal
    -- rows are always later-dated, never backdated.
    and t.ends_on = (
      select max(t2.ends_on) from membership.terms t2 where t2.member_id = t.member_id
    )

  union all

  select
    t.id, t.member_id, identity.display_name(m.person_id), p.email,
    tr.name, t.ends_on, '7d'
  from membership.terms t
  join membership.members m on m.id = t.member_id
  join identity.people p on p.id = m.person_id
  join membership.tiers tr on tr.key = t.tier_key
  where m.status = 'active'
    and t.ends_on > current_date
    and t.ends_on <= current_date + 7
    and t.renewal_notice_7d_sent_at is null
    and t.ends_on = (
      select max(t2.ends_on) from membership.terms t2 where t2.member_id = t.member_id
    );
$$;
comment on function api.terms_due_for_renewal_notice() is
  'Every term due a T-30 or T-7 renewal notice it has not yet received. '
  'A term appearing for both in the same run (a short-lived term, or a '
  'job that missed several days) sends both -- each column is its own '
  'independent idempotency guard, per D-11''s "T-30... one reminder at '
  'T-7" reading as two distinct notices, not a state machine between them.';

revoke all on function api.terms_due_for_renewal_notice from public, anon, authenticated;
grant execute on function api.terms_due_for_renewal_notice to service_role;

create function api.mark_renewal_notice_sent(p_term uuid, p_notice_kind text)
returns void
language plpgsql
security definer
set search_path = membership, pg_temp
as $$
begin
  if p_notice_kind = '30d' then
    update membership.terms set renewal_notice_30d_sent_at = now() where id = p_term;
  elsif p_notice_kind = '7d' then
    update membership.terms set renewal_notice_7d_sent_at = now() where id = p_term;
  else
    raise exception 'Unknown notice_kind: %', p_notice_kind;
  end if;
end;
$$;

revoke all on function api.mark_renewal_notice_sent from public, anon, authenticated;
grant execute on function api.mark_renewal_notice_sent to service_role;
