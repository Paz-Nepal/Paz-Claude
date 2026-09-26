# PAZ OS Authorization Matrix

This document must stay in sync with `supabase/seed/authz.sql`. CI
(`scripts/check-authz-matrix.mjs`) fails the build if a permission key exists
in one but not the other.

**Current phase:** Foundation — identity, authz, and admin only. Publishing,
programs, membership, and CRM permissions are added to this
table by their own migrations as each domain is built, per the approved
dependency order.

## Roles

| Role                 | Summary                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `super_admin`        | Everything, including role administration. Two named humans maximum.                                            |
| `administrator`      | All modules except role administration and destructive settings.                                                |
| `editor`             | Full publishing lifecycle; manages taxonomies. _(permissions land with the publishing migration)_               |
| `author`             | Own drafts only; cannot publish. _(permissions land with the publishing migration)_                             |
| `program_manager`    | Programs, sessions, registrations, venues. _(permissions land with the programs migration)_                     |
| `membership_manager` | Applications, renewals, member records, directory. _(permissions land with the membership migration)_           |
| `finance`            | Financial views + payment recording; no content access. _(permissions land with the membership/CRM migrations)_ |
| `volunteer`          | Narrow, time-boxed grants via `expires_at`.                                                                     |
| `member`             | Member-only content, own profile, own registrations. _(permissions land with the membership migration)_         |

## Permissions (as of this phase)

| Permission key                   | Granted to                                              | Description                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity.person.read`           | super_admin, administrator                              | Read any person's profile                                                                                                                                              |
| `identity.person.update`         | super_admin, administrator                              | Update any person's profile fields                                                                                                                                     |
| `identity.person.merge`          | super_admin, administrator                              | Merge a duplicate person into a survivor                                                                                                                               |
| `identity.person.erase`          | super_admin, administrator                              | Execute a staff erasure request                                                                                                                                        |
| `authz.user_role.read`           | super_admin, administrator                              | View who holds which roles                                                                                                                                             |
| `authz.user_role.grant`          | super_admin                                             | Grant or revoke a role (Super-Admin-only, per spec §6)                                                                                                                 |
| `admin.settings.read`            | super_admin, administrator                              | View institutional settings                                                                                                                                            |
| `admin.settings.manage`          | super_admin, administrator                              | Change institutional settings                                                                                                                                          |
| `admin.audit_log.read`           | super_admin, administrator                              | View the audit log                                                                                                                                                     |
| `admin.contact_message.read`     | super_admin, administrator                              | View/mark-reviewed the public contact-form inbox                                                                                                                       |
| `publishing.item.read`           | super_admin, administrator, editor                      | Read every item regardless of status/author (the desk)                                                                                                                 |
| `publishing.item.create`         | super_admin, administrator, editor, author              | Create items; edit one's own drafts                                                                                                                                    |
| `publishing.item.update`         | super_admin, administrator, editor                      | Edit any item at any stage; send back to draft                                                                                                                         |
| `publishing.item.publish`        | super_admin, administrator, editor                      | Publish an item, or restore an archived one                                                                                                                            |
| `publishing.item.archive`        | super_admin, administrator, editor                      | Archive a published item                                                                                                                                               |
| `publishing.media.read`          | super_admin, administrator, editor, author              | Browse the media library                                                                                                                                               |
| `publishing.media.create`        | super_admin, administrator, editor, author              | Upload media and register it in the library                                                                                                                            |
| `publishing.media.manage`        | super_admin, administrator, editor                      | Edit any media's alt/credit metadata                                                                                                                                   |
| `membership.tier.manage`         | super_admin, administrator, membership_manager          | Create or edit membership tiers and fees (the Friends of PAZ tiers form, 0080)                                                                                         |
| `membership.application.read`    | super_admin, administrator, membership_manager          | View the membership application queue                                                                                                                                  |
| `membership.application.decide`  | super_admin, administrator, membership_manager          | Accept or decline a membership application                                                                                                                             |
| `membership.member.read`         | super_admin, administrator, membership_manager, finance | View the member roster                                                                                                                                                 |
| `membership.member.manage`       | super_admin, administrator, membership_manager          | Change a member's status                                                                                                                                               |
| `membership.term.manage`         | super_admin, administrator, membership_manager, finance | Record payment against a membership term                                                                                                                               |
| `programs.venue.manage`          | super_admin, administrator, program_manager             | Create or edit venues                                                                                                                                                  |
| `programs.program.read`          | super_admin, administrator, program_manager             | View inactive/cancelled programs and sessions                                                                                                                          |
| `programs.program.manage`        | super_admin, administrator, program_manager             | Create or edit programs and sessions                                                                                                                                   |
| `programs.registration.read`     | super_admin, administrator, program_manager, volunteer  | View a session's registration roster                                                                                                                                   |
| `programs.registration.manage`   | super_admin, administrator, program_manager, volunteer  | Cancel a registration; mark attendance                                                                                                                                 |
| `crm.organization.read`          | super_admin, administrator, membership_manager          | View institutional organizations                                                                                                                                       |
| `crm.organization.manage`        | super_admin, administrator, membership_manager          | Create or edit organizations and their people                                                                                                                          |
| `crm.relationship.read`          | super_admin, administrator, membership_manager, finance | View institutional relationships                                                                                                                                       |
| `crm.relationship.manage`        | super_admin, administrator, membership_manager          | Create, edit, or end a relationship                                                                                                                                    |
| `crm.interaction.create`         | super_admin, administrator, membership_manager          | Log an interaction against a relationship                                                                                                                              |
| `crm.pledge.read`                | super_admin, administrator, finance                     | View pledges                                                                                                                                                           |
| `crm.pledge.manage`              | super_admin, administrator, finance                     | Record, receipt, or acknowledge a pledge                                                                                                                               |
| `analytics.dashboard.editorial`  | super_admin, administrator, editor                      | View the editorial pipeline dashboard                                                                                                                                  |
| `analytics.dashboard.programs`   | super_admin, administrator, program_manager             | View the programme fill-rate dashboard                                                                                                                                 |
| `analytics.dashboard.membership` | super_admin, administrator, membership_manager          | View the membership funnel dashboard                                                                                                                                   |
| `analytics.dashboard.finance`    | super_admin, administrator, finance                     | View the financial summary dashboard                                                                                                                                   |
| `analytics.dashboard.vitals`     | super_admin, administrator                              | View the cross-domain institution vitals panel                                                                                                                         |
| `wall.manage`                    | super_admin, administrator, editor                      | Manage people, works, shows, work text and images                                                                                                                      |
| `sattal.manage`                  | super_admin, administrator, editor                      | Manage Sattal pieces and outside readers, and publish                                                                                                                  |
| `chronicle.line.create`          | super_admin, administrator, editor                      | Add a line to the Chronicle                                                                                                                                            |
| `crm.voice.read`                 | super_admin, administrator                              | Read the private voice intake                                                                                                                                          |
| `governance.manage`              | super_admin, administrator                              | Keep the register of hands: roles, offices, holders, open seats.                                                                                                       |
| `commons.manage`                 | super_admin, administrator                              | Keep the Commons register, Tables kept, the concurrence roll and the Assembly record.                                                                                  |
| `guild.manage`                   | super_admin, administrator                              | Keep the hallmark register: formed makers, marks, and destroyed punches.                                                                                               |
| `treasury.manage`                | super_admin, administrator                              | Write the Treasury account that goes into the Annual.                                                                                                                  |
| `encounters.manage`              | super_admin, administrator, editor                      | Add and edit Encounters on the public calendar.                                                                                                                        |
| `mail.manage`                    | super_admin, administrator, editor                      | Read the Brief subscriber list and send the Brief.                                                                                                                     |
| `site.wording.manage`            | super_admin, administrator, editor                      | Reword the fixed lines of the public site: menus, footer, page intros, form labels, empty sections.                                                                    |
| `house.manage`                   | super_admin, administrator, editor                      | Keep the house as a place: rooms and their photographs, things and where they came from, what the house would welcome, books, studio months, the days the house keeps. |
| `record.manage`                  | super_admin, administrator, editor                      | Keep the Record's catalogue (the open layer), the house's papers, consent lines and the listening log.                                                                 |
| `record.closed.read`             | super_admin                                             | Read and keep the closed layer of the Record: giver, witness, how the family is reached. Held by the Keeper.                                                           |
| `safeguarding.read`              | super_admin                                             | Read concerns raised through the safeguarding route. Held by one named person, never by the people a concern might be about.                                           |

## Adding a new permission

1. Add the row to `supabase/seed/authz.sql` (`authz.permissions`, plus
   `authz.role_permissions` for whichever roles should have it).
2. Add the matching row to this table.
3. `pnpm db:reset` locally and confirm `scripts/check-authz-matrix.mjs`
   passes before opening a PR — CI runs it again regardless.
