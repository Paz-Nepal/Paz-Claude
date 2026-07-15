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
  ('admin.audit_log.read', 'View the audit log.')
on conflict (key) do nothing;

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
