# PAZ OS Authorization Matrix

This document must stay in sync with `supabase/seed/authz.sql`. CI
(`scripts/check-authz-matrix.mjs`) fails the build if a permission key exists
in one but not the other.

**Current phase:** Foundation — identity, authz, and admin only. Publishing,
programs, membership, CRM, and hospitality permissions are added to this
table by their own migrations as each domain is built, per the approved
dependency order.

## Roles

| Role                  | Summary                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `super_admin`         | Everything, including role administration. Two named humans maximum.                                            |
| `administrator`       | All modules except role administration and destructive settings.                                                |
| `editor`              | Full publishing lifecycle; manages taxonomies. _(permissions land with the publishing migration)_               |
| `author`              | Own drafts only; cannot publish. _(permissions land with the publishing migration)_                             |
| `program_manager`     | Programs, sessions, registrations, venues. _(permissions land with the programs migration)_                     |
| `membership_manager`  | Applications, renewals, member records, directory. _(permissions land with the membership migration)_           |
| `hospitality_manager` | Menu, reservations, service settings. _(permissions land with the hospitality migration)_                       |
| `finance`             | Financial views + payment recording; no content access. _(permissions land with the membership/CRM migrations)_ |
| `volunteer`           | Narrow, time-boxed grants via `expires_at`.                                                                     |
| `member`              | Member-only content, own profile, own registrations. _(permissions land with the membership migration)_         |

## Permissions (as of this phase)

| Permission key            | Granted to                                 | Description                                            |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `identity.person.read`    | super_admin, administrator                 | Read any person's profile                              |
| `identity.person.update`  | super_admin, administrator                 | Update any person's profile fields                     |
| `identity.person.merge`   | super_admin, administrator                 | Merge a duplicate person into a survivor               |
| `identity.person.erase`   | super_admin, administrator                 | Execute a staff erasure request                        |
| `authz.user_role.read`    | super_admin, administrator                 | View who holds which roles                             |
| `authz.user_role.grant`   | super_admin                                | Grant or revoke a role (Super-Admin-only, per spec §6) |
| `admin.settings.read`     | super_admin, administrator                 | View institutional settings                            |
| `admin.settings.manage`   | super_admin, administrator                 | Change institutional settings                          |
| `admin.audit_log.read`    | super_admin, administrator                 | View the audit log                                     |
| `publishing.item.read`    | super_admin, administrator, editor         | Read every item regardless of status/author (the desk) |
| `publishing.item.create`  | super_admin, administrator, editor, author | Create items; edit one's own drafts                    |
| `publishing.item.update`  | super_admin, administrator, editor         | Edit any item at any stage; send back to draft         |
| `publishing.item.publish` | super_admin, administrator, editor         | Publish an item, or restore an archived one            |
| `publishing.item.archive` | super_admin, administrator, editor         | Archive a published item                               |
| `publishing.media.read`   | super_admin, administrator, editor, author | Browse the media library                               |
| `publishing.media.create` | super_admin, administrator, editor, author | Upload media and register it in the library            |
| `publishing.media.manage` | super_admin, administrator, editor         | Edit any media's alt/credit metadata                   |

## Adding a new permission

1. Add the row to `supabase/seed/authz.sql` (`authz.permissions`, plus
   `authz.role_permissions` for whichever roles should have it).
2. Add the matching row to this table.
3. `pnpm db:reset` locally and confirm `scripts/check-authz-matrix.mjs`
   passes before opening a PR — CI runs it again regardless.
