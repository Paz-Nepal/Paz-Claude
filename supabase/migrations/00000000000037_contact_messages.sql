-- 0037_contact_messages.sql
--
-- Public contact form intake (Build Readiness Review T-068). The
-- Architecture Blueprint's Edge Function table sketches this as "contact
-- form -> CRM interaction + notification," but crm.interactions requires
-- an existing relationship_id, and 0020_crm.sql's own header is explicit
-- that CRM has "No public surface at all" -- every write there is
-- staff-only by design, and a first message from a stranger has no
-- relationship to log against yet. Rather than force a public write path
-- through a domain that already drew a firm line against having one,
-- this follows publishing.pigeon_submissions' precedent (0033) for
-- exactly this shape of problem: a public submission that becomes
-- staff-visible, reviewed by hand, nothing automatic. If a message turns
-- into a real institutional relationship, staff create that CRM
-- relationship themselves, same as they would for a phone call or a
-- letter -- this table is not the CRM side-door the blueprint sketch
-- implied.
--
-- Deliberately NOT here: Turnstile / rate limiting (same known gap as
-- every other public intake form in this repository, per the pattern
-- already noted in 0010_membership.sql and 0033).

create table admin.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        citext not null,
  message      text not null,
  submitted_at timestamptz not null default now(),
  reviewed     boolean not null default false,
  reviewed_by  uuid references identity.people (id) on delete restrict,
  reviewed_at  timestamptz
);
comment on table admin.contact_messages is
  'Public contact form submissions -- private inbox, reviewed by hand, '
  'never auto-published or auto-linked into CRM (see migration header). '
  'reviewed = true is how a message leaves the queue; there is no delete '
  'grant to anyone, staff included, so the inbox stays auditable.';

create index contact_messages_unreviewed_idx
  on admin.contact_messages (submitted_at desc) where not reviewed;

alter table admin.contact_messages enable row level security;
grant select, update on admin.contact_messages to authenticated;
-- No insert grant: written only by api.submit_contact_message() (security
-- definer), so a visitor with no account can still submit. No delete
-- grant to anyone, matching pigeon_submissions' reasoning exactly.

create policy contact_messages_select_staff on admin.contact_messages
  for select to authenticated
  using ((select authz.has_staff_permission('admin.contact_message.read')));

create policy contact_messages_update_staff on admin.contact_messages
  for update to authenticated
  using ((select authz.has_staff_permission('admin.contact_message.read')))
  with check ((select authz.has_staff_permission('admin.contact_message.read')));

-- ---------------------------------------------------------------------
-- api surface
-- ---------------------------------------------------------------------
create function api.submit_contact_message(p_full_name text, p_email text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = admin, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Full name is required';
  end if;
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required';
  end if;
  if p_message is null or btrim(p_message) = '' then
    raise exception 'Message is required';
  end if;

  insert into admin.contact_messages (full_name, email, message)
  values (p_full_name, p_email, p_message)
  returning id into v_id;

  return v_id;
end;
$$;
comment on function api.submit_contact_message(text, text, text) is
  'Public intake -- security definer so a visitor with no account can '
  'submit. The submit-contact-message Edge Function calls this, then '
  'notifies staff by email (send-email.ts) -- notifying the submitter is '
  'deliberately not part of this: D-13 scopes automated email to '
  'transactional/membership-lifecycle sends, and a contact message is '
  'neither.';

revoke all on function api.submit_contact_message from public;
grant execute on function api.submit_contact_message to anon, authenticated;

create view api.contact_messages
with (security_invoker = true)
as
select id, full_name, email, message, submitted_at, reviewed, reviewed_at
from admin.contact_messages;

grant select on api.contact_messages to authenticated;

create function api.mark_contact_message_reviewed(p_id uuid)
returns void
language sql
volatile
security invoker
set search_path = admin, authz, pg_temp
as $$
  update admin.contact_messages
  set reviewed = true, reviewed_by = (select authz.current_person_id()), reviewed_at = now()
  where id = p_id;
$$;

revoke all on function api.mark_contact_message_reviewed from public, anon;
grant execute on function api.mark_contact_message_reviewed to authenticated;
