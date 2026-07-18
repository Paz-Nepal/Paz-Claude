-- authz.sql (reference seed — runs in every environment: local, staging, production)
--
-- Only roles/permissions for domains that exist as of this phase (identity,
-- authz, admin) are seeded here. Kept honest deliberately: seeding
-- `publishing.item.publish` before the publishing schema exists would be a
-- permission for a table that doesn't exist yet. Each later domain's own
-- migration adds its permission keys and role_permission rows at the same
-- time it creates its tables — see e.g. the eventual
-- 00000000000NN_publishing.sql. docs/authz-matrix.md mirrors this file and
-- is checked for drift by scripts/check-authz-matrix.ts in CI.

insert into authz.roles (key, name, description) values
  ('super_admin', 'Super Admin', 'Everything, including role administration and destructive settings. Two named humans maximum.'),
  ('administrator', 'Administrator', 'All modules except role administration and destructive settings.'),
  ('editor', 'Editor', 'Full publishing lifecycle including publish/schedule; manages taxonomies.'),
  ('author', 'Author', 'Creates and edits own drafts; submits for review; cannot publish.'),
  ('program_manager', 'Program Manager', 'Programs, sessions, registrations, venues.'),
  ('membership_manager', 'Membership Manager', 'Applications, renewals, member records, directory moderation.'),
  ('hospitality_manager', 'Hospitality Manager', 'Menu, reservations, service settings.'),
  ('finance', 'Finance', 'Reads financial views across membership/CRM; records payments; no content access.'),
  ('volunteer', 'Volunteer', 'Narrow, time-boxed grants (e.g. event check-in) via user_roles.expires_at.'),
  ('member', 'Member', 'Member-only content, directory (if opted in), own profile, own registrations.')
on conflict (key) do nothing;

insert into authz.permissions (key, description) values
  ('identity.person.read', 'Read any person''s profile (staff directory/CRM lookup).'),
  ('identity.person.update', 'Update any person''s profile fields.'),
  ('identity.person.merge', 'Merge a duplicate person record into a survivor.'),
  ('identity.person.erase', 'Execute a staff erasure request per docs/policies/erasure.md.'),
  ('authz.user_role.read', 'View who holds which roles.'),
  ('authz.user_role.grant', 'Grant or revoke a role from a person.'),
  ('admin.settings.read', 'View institutional settings.'),
  ('admin.settings.manage', 'Change institutional settings.'),
  ('admin.audit_log.read', 'View the audit log.'),
  ('publishing.item.read', 'Read every item regardless of status or author (the editorial desk view).'),
  ('publishing.item.create', 'Create items and edit one''s own drafts.'),
  ('publishing.item.update', 'Edit any item at any workflow stage and send items back to draft.'),
  ('publishing.item.publish', 'Publish an item, or restore an archived one.'),
  ('publishing.item.archive', 'Archive a published item.'),
  ('publishing.media.read', 'Browse the media library.'),
  ('publishing.media.create', 'Upload media and register it in the library.'),
  ('publishing.media.manage', 'Edit any media''s alt/credit metadata.'),
  ('membership.tier.manage', 'Create or edit membership tiers and fees.'),
  ('membership.application.read', 'View the membership application queue.'),
  ('membership.application.decide', 'Accept or decline a membership application.'),
  ('membership.member.read', 'View the member roster.'),
  ('membership.member.manage', 'Change a member''s status (lapse, pause, resign, honorary).'),
  ('membership.term.manage', 'Record payment against a membership term.'),
  ('programs.venue.manage', 'Create or edit venues.'),
  ('programs.program.read', 'View inactive/cancelled programs and sessions (the admin listing).'),
  ('programs.program.manage', 'Create or edit programs and sessions.'),
  ('programs.registration.read', 'View a session''s registration roster.'),
  ('programs.registration.manage', 'Cancel another person''s registration; mark attendance.'),
  ('crm.organization.read', 'View institutional organizations.'),
  ('crm.organization.manage', 'Create or edit organizations and their people.'),
  ('crm.relationship.read', 'View institutional relationships.'),
  ('crm.relationship.manage', 'Create, edit, or end a relationship.'),
  ('crm.interaction.create', 'Log an interaction against a relationship.'),
  ('crm.pledge.read', 'View pledges.'),
  ('crm.pledge.manage', 'Record, receipt, or acknowledge a pledge.')
on conflict (key) do nothing;

-- Editorial roles (Blueprint §8.1: editors own the full lifecycle; authors
-- own their drafts and cannot publish).
insert into authz.role_permissions (role_key, permission_key) values
  ('editor', 'publishing.item.read'),
  ('editor', 'publishing.item.create'),
  ('editor', 'publishing.item.update'),
  ('editor', 'publishing.item.publish'),
  ('editor', 'publishing.item.archive'),
  ('editor', 'publishing.media.read'),
  ('editor', 'publishing.media.create'),
  ('editor', 'publishing.media.manage'),
  ('author', 'publishing.item.create'),
  ('author', 'publishing.media.read'),
  ('author', 'publishing.media.create')
on conflict do nothing;

-- Membership Manager owns the full applications->members->terms lifecycle;
-- Finance only records payments and needs read access to know who they're
-- recording a payment for (Build Readiness Review, Roles table: "no
-- content access").
insert into authz.role_permissions (role_key, permission_key) values
  ('membership_manager', 'membership.tier.manage'),
  ('membership_manager', 'membership.application.read'),
  ('membership_manager', 'membership.application.decide'),
  ('membership_manager', 'membership.member.read'),
  ('membership_manager', 'membership.member.manage'),
  ('membership_manager', 'membership.term.manage'),
  ('finance', 'membership.member.read'),
  ('finance', 'membership.term.manage')
on conflict do nothing;

-- Program Manager owns venues/programs/sessions/roster. Volunteer gets a
-- narrow slice (registration read + attendance marking only) — matches the
-- role's own description: "narrow, time-boxed grants via expires_at",
-- e.g. day-of-event check-in access.
insert into authz.role_permissions (role_key, permission_key) values
  ('program_manager', 'programs.venue.manage'),
  ('program_manager', 'programs.program.read'),
  ('program_manager', 'programs.program.manage'),
  ('program_manager', 'programs.registration.read'),
  ('program_manager', 'programs.registration.manage'),
  ('volunteer', 'programs.registration.read'),
  ('volunteer', 'programs.registration.manage')
on conflict do nothing;

-- No dedicated CRM role exists in the architecture doc. Institutional
-- relationships overlap naturally with membership_manager's remit; finance
-- needs relationship + pledge access to record and acknowledge gifts
-- against the right relationship (their existing scope is "financial
-- views + payment recording, no content access").
insert into authz.role_permissions (role_key, permission_key) values
  ('membership_manager', 'crm.organization.read'),
  ('membership_manager', 'crm.organization.manage'),
  ('membership_manager', 'crm.relationship.read'),
  ('membership_manager', 'crm.relationship.manage'),
  ('membership_manager', 'crm.interaction.create'),
  ('finance', 'crm.relationship.read'),
  ('finance', 'crm.pledge.read'),
  ('finance', 'crm.pledge.manage')
on conflict do nothing;

-- Super Admin and Administrator get every permission seeded so far.
-- (When a new domain migration adds permissions, it grants them to the
-- appropriate roles itself — this blanket grant only covers what exists
-- at this phase.)
insert into authz.role_permissions (role_key, permission_key)
select 'super_admin', key from authz.permissions
on conflict do nothing;

insert into authz.role_permissions (role_key, permission_key)
select 'administrator', key from authz.permissions
where key not in ('authz.user_role.grant') -- role administration stays Super-Admin-only, per spec §6
on conflict do nothing;
