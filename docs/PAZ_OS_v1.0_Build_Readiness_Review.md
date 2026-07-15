# PAZ OS v1.0 — Final Architecture Validation & Build Readiness Review

**Reviewer role:** Principal Engineer, production approval authority
**Document under review:** PAZ OS v1.0 Architecture Blueprint
**Question under review:** _Can a senior engineering team start building PAZ OS tomorrow using this document?_

---

## Verdict (stated up front)

**Almost — but not tomorrow morning.** The architecture is sound and does not require redesign. The blueprint makes the right structural decisions (modular monolith, person-centric identity, DB-enforced state machines, exit-capable Supabase posture) and none of them contain a critical flaw. However, a senior team starting tomorrow would stall within the first week on **twelve unmade decisions and four database-level gaps** — chiefly the person-merge procedure, media lifecycle, membership renewal mechanics, index strategy, and FK delete semantics. These are resolved in this review.

**Final status: APPROVED WITH REQUIRED CHANGES** (§10). All required changes are decisions and additions, not redesigns. With this review merged into the blueprint, the team can commit on day one.

---

## 1. Architecture Completeness Review

| Decision                | Status                     | Assessment                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modular monolith        | ✅ **Ready**               | Correct for team size and horizon. Schema-per-domain gives real boundaries without network costs. Extraction path exists if ever needed. Do not revisit.                                                                                                                                                                                                                     |
| Domain schemas          | ✅ **Ready**               | Ten schemas with an ownership table and a cross-write prohibition is implementable as written. One addition required: the "cross-domain writes only through owning domain's functions" rule must be _enforced_, not just documented — see §3.1 (grants model).                                                                                                               |
| Person-centric identity | ⚠️ **Needs clarification** | The model is right. But the blueprint names `merged_into` without defining the **merge procedure**, and names anonymization without defining the **erasure specification**. A team cannot build `identity` week one without these. Resolved in §2.1.                                                                                                                         |
| Unified content system  | ✅ **Ready**               | Core + extensions with a DB-enforced state machine is production-grade. Two clarifications folded in below: extension tables were named but never specified (§2.2), and the ProseMirror schema needs a frozen v1 node list before the editor is built (§2.2).                                                                                                                |
| Supabase strategy       | ✅ **Ready**               | Exit-capable posture is correct and the one-week restore test is the right acceptance criterion. Conditions of long-term safety are enumerated in §4 — they must become CI/runbook enforcement, not prose.                                                                                                                                                                   |
| API architecture        | ✅ **Ready**               | Two-lane design (PostgREST on `api` schema only + Edge Functions for side effects) is correct and unambiguous. One gap: API **versioning discipline** for views was never stated — resolved in §2.6.                                                                                                                                                                         |
| RLS security model      | ⚠️ **Needs clarification** | Doctrine is right (RLS everywhere, two authz functions, pgTAP both directions). What's missing is the **performance discipline** — naïve RLS with per-row function calls will make list endpoints crawl at a few thousand rows. Concrete rules in §3.4. Not a design change; an implementation standard.                                                                     |
| Storage strategy        | ⚠️ **Needs clarification** | Buckets, signed URLs, and re-encoding were stated, but the **media lifecycle** (variants, orphan cleanup, retention, deletion vs. archive) was not designed. Resolved in §2.2.                                                                                                                                                                                               |
| Backup strategy         | ✅ **Ready**               | Nightly off-platform encrypted export + quarterly restore drill + annual static archive is the strongest section of the blueprint. One correction: verify the actual Supabase plan tier supports PITR before relying on the 7-day window; if on a tier without PITR at launch, daily logical backups + WAL are the fallback and the RPO statement must be adjusted honestly. |

**No decision requires change before implementation. Five require the clarifications resolved in this document.**

---

## 2. Missing Decisions Review — Decisions Now Made

Each item below was unmade in the blueprint. As reviewing Principal Engineer I make the call; each becomes an ADR (numbering continues from ADR-14).

### 2.1 Identity

**D-1. Duplicate person handling & merge process (ADR-15).**
Duplicates are detected (a) at creation time — Edge Functions and admin forms check `citext` email and normalized phone before inserting, surfacing "possible existing person" to staff; and (b) by a weekly job producing a candidate-duplicates review queue (same email domain + fuzzy name via `pg_trgm`). Merging is a single database function:

```sql
identity.merge_people(survivor uuid, duplicate uuid, actor uuid)
```

which, in one transaction: re-points every referencing FK (the list of referencing tables is generated from `information_schema`, asserted complete by a pgTAP test that fails when a new FK to `people` is added without updating the merge function), unions non-conflicting profile fields (survivor wins conflicts), sets `duplicate.merged_into = survivor`, revokes the duplicate's auth link, and writes a full audit row with the pre-merge snapshots. Merges are **not reversible** by design; the audit snapshot is the recovery path. Only `identity.person.merge` permission (Administrator+) may call it.

**D-2. Anonymous visitors (ADR-16).** Anonymous web visitors are _not_ people. No shadow person records, no visitor IDs in `identity`. They exist only as rotating daily hashes in `analytics.events`. A person record is created at the first _named_ interaction (reservation, application, contact form, registration) — and reservation-only guests get a minimal record (name + phone) flagged `source = 'reservation'` so CRM views can filter operational contacts from relationships.

**D-3. Account deletion & erasure specification (ADR-17).** Two distinct operations, both audit-logged:

- **Account closure** (self-service): unlinks `auth_user_id`, deletes credentials. The person record and history remain. This is the default.
- **Erasure request** (staff-executed, `identity.person.erase` permission): `identity.erase_person(id, actor)` replaces `full_name → 'Erased Person'`, nulls email/phone/bio/avatar, deletes storage avatars, scrubs `guest_*` fields on their reservations, redacts CRM interaction notes that identify them, and _preserves_: member number (as a tombstone), authorship rows on **published** items (bylines are part of the published record — erasure of a published byline is an editorial decision requiring Editor sign-off and a republication, not a data operation), and aggregate analytics. A written erasure policy in `docs/policies/erasure.md` is a Phase 0 deliverable because staff will be asked before engineers expect.

**D-4. Former members (ADR-18).** Status transitions on `membership.members`: `active → lapsed` (automatic, term expired + grace), `→ paused` (staff, sabbatical), `→ resigned` (member request), `→ honorary` (board decision). Former members keep person records, member numbers, and history; they lose member-role permissions the moment status leaves `active`/`honorary` (the role check joins member status — no cron-dependent revocation). Directory listing requires _both_ opt-in and active status.

**D-5. Relationship history (ADR-19).** `crm.relationships` gets `status` transitions logged to audit plus a `superseded_by` self-reference for renegotiated relationships (a sponsor whose terms change gets a new relationship row, old one `ended`). The person timeline (blueprint §6.3) reads relationship + interaction history as-is; no separate history table needed.

### 2.2 Content & Media

**D-6. Type extension tables specified (ADR-20).** The blueprint promised extensions but never defined them. v1.0 ships exactly three; everything else uses the core alone:

- `publishing.paper_details(item_id pk, paper_no int unique, abstract text, pdf_media uuid, citation text)`
- `publishing.dispatch_details(item_id pk, issue_no int unique, sent_at timestamptz, recipient_count int)`
- `publishing.pigeon_post_details(item_id pk, edition_no int unique, print_run int)`

**D-7. Frozen ProseMirror v1 node set (ADR-21).** `doc, paragraph, heading(2–4), blockquote, pullquote, bullet_list, ordered_list, list_item, figure(image, caption, credit, alt required), horizontal_rule, footnote, embed(provider ∈ {youtube, vimeo, soundcloud})`; marks: `strong, em, link(href validated), small_caps`. Any new node type requires a schema-version bump stored on the item (`body_schema_version int not null default 1`) and a renderer that supports all prior versions forever. This column is a required change (§10) — without it the 2060 re-render promise is unenforceable.

**D-8. Media lifecycle & image processing (ADR-22).**

- **Ingest**: Edge Function `ingest-media` — MIME sniff (not extension trust), size caps (images 15MB, docs 50MB), images re-encoded to clean originals, EXIF GPS stripped, dimensions recorded. Originals stored at `media/original/{uuid}.{ext}`.
- **Variants**: Supabase Image Transformations generate sizes on the fly (no pre-generated variant files to manage); the renderer requests standard widths (480/960/1440/2048). If transformations prove unavailable/costly on the plan, fallback is on-ingest generation of the four widths — decide in Phase 0 spike task T-021.
- **Orphans**: media never auto-deletes. A monthly report lists media unreferenced by any item/attachment for staff review; deletion is manual with `publishing.media.delete` permission and is blocked by trigger if any reference exists.
- **Retention**: media referenced by any _published_ item (current or archived) is permanent. This is an archive.

**D-9. Search indexing (ADR-23).** Postgres FTS: a generated `tsvector` column on `publishing.items` built from title + subtitle + summary + a body-text extraction function over the ProseMirror JSON, GIN-indexed, `english` config with a `simple` fallback column for names/Nepali transliterations. Exposed via `api.search_published(q text)`. No external search service in v1.x; revisit above ~50k items (decades away).

**D-10. Content export (ADR-24).** The annual static archive (blueprint §9) is specified now: `scripts/export-archive` renders every published item to standalone HTML (inlined CSS, local media copies), plus a JSONL dump of the structured bodies, plus a manifest with checksums. Run annually and after any major schema-version bump. Acceptance test: the export opens correctly from a USB stick with no network.

### 2.3 Membership

**D-11. Renewal workflow & expiry (ADR-25).** Term-based, date-driven:

- T−30 days: renewal notice email (warm, single, no urgency theater — one reminder at T−7, none after).
- Expiry: status `active → lapsed` enters a **30-day grace** where access continues but the member surface shows a quiet renewal note; after grace, member-role checks fail (D-4).
- Renewal = Finance/Membership Manager records payment → new `membership.terms` row → status back to `active`. Continuous terms preserve an unbroken `joined_on`.
- Lapsed >12 months: reactivation still allowed without reapplication for v1.0 (the Membership Manager may require a fresh application at their discretion — a judgment call, not a system rule).

**D-12. Invitations (ADR-26).** Application decision `invited` triggers an invitation email containing a single-use, 14-day acceptance token (Edge Function `accept-membership-invitation`): acceptance creates the member record + first term (unpaid), member number issued at acceptance, payment recorded when it arrives. Expired invitations can be re-issued by the manager; the application remains `invited` until accepted, declined, or withdrawn.

**D-13. Member communication (ADR-27).** v1.0 sends **transactional and membership-lifecycle email only** (application received/decided, invitation, renewal notices, registration confirmations, reservation confirmations). Editorial email (Dispatch) is Phase 2 as planned, with per-recipient unsubscribe tokens and a `communication_preferences jsonb` column on `identity.people` (`{dispatch: bool, programs: bool}`) added _now_ so consent is captured from the first form.

### 2.4 CRM

**D-14. Relationship timeline & interaction history (ADR-28).** The person timeline is a database view union-ing domain events (`api.person_timeline(person_id)`), each source row tagged with the permission needed to see it; the view filters by `authz.has_permission` per row category. Interactions are append-only for non-admins: authors may edit their own interaction within 24h, after which correction happens by a follow-up note (protects the integrity of institutional memory).

**D-15. Donor records (ADR-29).** Pledge vs. receipt already separated (`pledged_on` / `received_on`). Add: `acknowledged_at` + `acknowledged_by` (every gift gets a human thank-you, tracked), an `anonymous boolean` (donor known internally, never surfaced in any public/aggregate view), and a Finance-owned annual giving summary view per relationship. No public donor walls in v1.0 — if leadership wants recognition pages later, that's a publishing item, curated by hand.

### 2.5 Analytics

**D-16. Dashboard ownership & reporting permissions (ADR-30).** Each dashboard has a named owning role: editorial pipeline → Editor; program fill → Program Manager; membership funnel/renewals → Membership Manager; reservations → Hospitality Manager; institution vitals + all-domain view → Administrator; financial summaries → Finance. Cross-domain numbers on the Administrator vitals panel are _aggregates only_ — drilling into rows follows domain RLS. Permission keys: `analytics.dashboard.{domain}`.

**D-17. Analytics data retention (ADR-31).** Raw `analytics.events`: 90 days (as blueprinted). Daily rollups: permanent. Participation-derived facts (attendance, renewals): permanent — they are domain data, not analytics. Ad-hoc exports of rollups require `analytics.export` and are audit-logged.

### 2.6 One addition the checklist missed

**D-18. API surface versioning (ADR-32).** Views in `api` are the public contract. Breaking a view's shape requires creating `api.published_items_v2` alongside the old one, migrating clients, then dropping v1 in a later migration. Additive changes (new nullable columns) are allowed in place. This rule is what makes "replace the frontend without touching the backend" true in practice.
---

## 3. Database Production Review

### 3.1 Schema boundaries — enforce with grants, not discipline

The blueprint's cross-write prohibition must be mechanical. Standard: application roles (`authenticated`, `anon`) get **no direct table privileges** in domain schemas at all — only `usage` + `select` on `api` views and `execute` on whitelisted functions. Domain functions are `security definer` with **pinned `search_path`** (`set search_path = <domain>, pg_temp`) — an unpinned security-definer function is a privilege-escalation vector and this is the single most common Supabase security mistake. A pgTAP test asserts every security-definer function has a pinned search path.

Enable required extensions in migration 0001: `citext`, `pg_trgm`, `pgcrypto`, `pg_cron` (verify availability on the chosen Supabase plan — if `pg_cron` is unavailable, scheduled work runs via Supabase scheduled Edge Functions instead; the blueprint's `publish-scheduled` design already tolerates either).

### 3.2 Foreign keys — delete semantics were unspecified (required change)

The blueprint writes FKs without `on delete` behavior. Standard, applied everywhere:

| Relationship class                                                   | Rule                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Anything → `identity.people`                                         | `on delete restrict` (people are never hard-deleted; restrict makes that structural)                                                        |
| Child of aggregate (revisions→item, sections→menu, sessions→program) | `on delete restrict` in production semantics; deletion of aggregates is status-based (`archived`), never row deletion once referenced       |
| Join tables (item_authors, item_terms, org_people)                   | `on delete cascade` from both sides                                                                                                         |
| Optional references (featured_image, table_id, venue_id)             | `on delete set null`                                                                                                                        |
| Audit log FKs                                                        | **No FK on `entity_id`** (audit must outlive anything it describes); `actor` FK `on delete restrict` is fine given people are never deleted |

Also missing and now required: `check (ends_at > starts_at)` on sessions and terms; `check (closes > opens)` on service periods; exclusion constraint `exclude using gist (table_id with =, tstzrange(starts_at, starts_at + make_interval(mins => duration_minutes)) with &&)` on confirmed reservations (requires `btree_gist`) — this makes double-booking a table _impossible_ rather than merely checked.

### 3.3 Indexes — entirely absent from the blueprint (required change)

Minimum viable index set, shipped with the tables that need them:

```
publishing.items        (status, type, published_at desc)      -- desk + public lists
publishing.items        (type, slug)                            -- exists via unique
publishing.items        gin (search_tsv)                        -- FTS
publishing.item_revisions (item_id, revision_no desc)
publishing.item_terms   (term_id, item_id)                      -- reverse of PK
programs.sessions       (program_id, starts_at)
programs.sessions       (starts_at) where status = 'scheduled'  -- calendar
programs.registrations  (person_id), (session_id, status)
membership.members      (status, tier_key)
membership.terms        (member_id, ends_on desc)
membership.terms        (ends_on) where paid_at is not null     -- renewal job scan
crm.relationships       (kind, status), (owner_person)
crm.interactions        (relationship_id, occurred_at desc)
hospitality.reservations (starts_at) , (status, starts_at)      -- desk board
identity.people         (auth_user_id), gin (full_name gin_trgm_ops)  -- dup detection
admin.audit_log         (occurred_at desc), (entity_table, entity_id), (actor)
analytics.events        (occurred_at)                            -- prune + rollup; consider monthly partitions from day one
```

`analytics.events` and `admin.audit_log` are the two unbounded-growth tables. Decision: **partition `analytics.events` by month from the start** (cheap now, painful later); leave `audit_log` unpartitioned until it demonstrably matters (append-only bigint PK, low read volume — revisit at ~10M rows).

### 3.4 RLS production discipline (required change — implementation standard)

Naïve policies destroy list-query performance. Rules, enforced in review and pgTAP-adjacent EXPLAIN checks:

1. `authz.current_person_id()` and `authz.has_permission()` are `stable`, and **every call inside a policy is wrapped as an initplan**: `using ( (select authz.has_permission('x')) )` — the `select` wrapper makes Postgres evaluate once per statement instead of once per row. This single idiom is the difference between 5ms and 5s on a 10k-row table.
2. Public read paths (`api.published_items` etc.) are defined so the policy predicate is index-aligned (`status = 'published'` matches the partial/composite indexes above).
3. Policies never join more than one auxiliary table; anything more complex becomes a `security definer` helper returning a boolean or a set of ids.
4. Per-table policy count kept minimal: one per command per audience; no stacks of overlapping permissive policies.
5. `explain (analyze)` snapshots for the ten hottest queries are committed under `docs/perf/` at the end of each phase — drift is visible in review.

### 3.5 Triggers & functions

- Audit triggers: statement-level where possible; row-level triggers on hot tables capture minimal diffs (changed columns only) — full-row `before/after` JSONB on `publishing.items` autosaves would bloat the log. Autosave revisions (every 30s) go to `item_revisions` only, **not** to audit; audit records transitions and publishes.
- Revision autosave needs a coalescing rule: a new autosave revision replaces the previous _autosave_ revision within a 10-minute window (flagged `kind = 'autosave' | 'manual' | 'transition'`); manual and transition revisions are permanent. Otherwise a writing session creates hundreds of snapshots.
- All state-machine functions: `security definer`, pinned search path, row-lock the target (`for update`) before checking transitions.

### 3.6 Dangerous relationships & migration risks

- **`publishing.items.featured_image → publishing.media`** plus `media` referencing back through attachments is fine, but the media-orphan report (D-8) must treat `featured_image` as a reference — easy to miss.
- **`identity.people.merged_into` self-reference**: application reads must resolve merges (`coalesce(merged_into, id)`) in exactly one place — a `identity.canonical_person(uuid)` function — or drift will scatter half-merged reads across the codebase.
- **Enum types** (`item_type`, `item_status`): Postgres enums are cheap but altering them in a transaction has historical footguns. Standard: adding enum values is done in its own migration with no other statements. Domain-status columns elsewhere deliberately use `text + check` for easier evolution — the inconsistency is intentional: publishing status is core and stable; peripheral statuses will evolve.
- **Migration ordering risk**: `programs.programs.description_item → publishing.items` creates a cross-schema dependency; migrations must create schemas in dependency order (identity → authz → publishing → programs → …). The Phase 0 CI migration dry-run from zero catches ordering mistakes permanently.

---

## 4. Supabase Production Review

**Can PAZ safely operate on Supabase for 10+ years? Yes — conditionally.** The architecture already treats Supabase as "managed Postgres + conveniences," which is the only posture that makes a 10-year bet safe. The conditions must be enforced mechanically:

**Must be enforced (non-negotiable):**

1. **Paid plan, production project** — free tier pauses inactive projects and lacks PITR/support; unacceptable for an institution. Verify PITR availability on the chosen tier during Phase 0 (T-006); adjust the stated RPO honestly if daily backups are the floor at launch.
2. **Nightly off-platform export is the sovereignty guarantee** (blueprint §9) — it, not Supabase's own backups, is what makes the 10-year answer "yes." The quarterly restore drill is a calendar event with a named owner from Phase 0, not from launch.
3. **No dashboard mutations in staging/prod** — enforce by not granting dashboard access beyond read-only to anyone but the two Super Admins, and by the CI rule that schema diffs against migrations fail the build (`supabase db diff` in CI must return empty).
4. **`service_role` key**: Edge Functions and CI only; rotated on any staff departure with access; never in the repo (secret scanning in CI).
5. **Auth settings as code**: auth configuration (providers, session lifetimes, MFA enforcement) documented in `docs/runbooks/auth-config.md` and re-verified quarterly — Supabase auth config is dashboard-managed, so drift control is procedural. MFA enforcement itself is structural: staff-permission RLS checks require `aal2` from the JWT (blueprint §8.2), so a mis-toggled dashboard setting cannot silently remove MFA.
6. **Storage**: buckets and their policies created by migrations (storage schema is Postgres); public bucket serves only published media; everything else signed URLs with short TTLs.
7. **Edge Function runtime pinning**: Deno/std versions pinned per function; upgrades are PRs, not surprises.
8. **Version upgrades**: Supabase Postgres major upgrades are scheduled maintenance events with a staging rehearsal first — the staging project exists partly for this.
9. **Vendor-health review, annually**: pricing, terms, incident history. The exit test (restore to self-hosted within one week) is _rehearsed_ in year one, not merely asserted.

**Disaster-recovery gap to close (required change):** the blueprint defines RPO/RTO but not the **DR decision tree** — who declares an incident, the order of restoration (database → storage → auth users → DNS), and the auth caveat: `auth.users` password hashes are included in `pg_dump` of the auth schema, but a restore to self-hosted requires standing up GoTrue or forcing password resets — the runbook must choose (recommendation: accept forced reset on catastrophic restore; document it). Runbook `docs/runbooks/disaster-recovery.md` is a Phase 0 deliverable.

---

## 5. Frontend Implementation Review

The stack (React, TypeScript, Vite, Tailwind, TanStack Query) is confirmed. The blueprint's structure is right; here it is made concrete enough to scaffold on day one.

### 5.1 Recommended structure (final)

```
apps/web/src/
├── app/
│   ├── router.tsx            # route table only; all routes lazy
│   ├── providers.tsx         # QueryClient, Auth, Toaster, ErrorBoundary
│   └── layouts/              # PublicLayout, AdminLayout, MemberLayout
├── modules/<domain>/         # publishing, programs, membership, crm, hospitality, admin-core
│   ├── api/                  # typed query/mutation hooks — the ONLY Supabase touchpoint
│   ├── components/           # domain components (compose packages/ui)
│   ├── pages/                # route components, thin
│   ├── schemas.ts            # zod (imported by matching Edge Function)
│   └── index.ts              # PUBLIC surface; deep imports across modules are lint-banned
├── lib/                      # supabase client, queryClient, analytics beacon, errors
└── styles/
```

**Module boundary enforcement:** `eslint-plugin-boundaries` (or `import/no-restricted-paths`) configured so `modules/A` cannot import from `modules/B/*` except `modules/B/index.ts` — the blueprint's rule becomes a lint failure, not a convention.

### 5.2 State management — decision

**No global state library.** Server state: TanStack Query exclusively. Auth/session: React context wrapping the Supabase session (the prototype's `AuthProvider` pattern, typed and hardened). Local UI state: component state. Cross-cutting UI (toasts, dialogs): existing shadcn patterns. Adding Redux/Zustand/Jotai would be unnecessary technology; if a genuinely global client concern appears later, Zustand is the sanctioned choice — recorded so nobody relitigates it (ADR-33).

### 5.3 Forms & validation

`react-hook-form` + `zodResolver`; every form's zod schema lives in `modules/<domain>/schemas.ts` and the corresponding Edge Function imports the same schema from a shared location (`packages/types/schemas/`) — single source of validation truth. Server errors map to field errors via one shared helper. Public forms embed Turnstile via one wrapper component.

### 5.4 Error handling — standard

- Route-level `ErrorBoundary` per layout with a calm institutional error page (no stack traces, an incident reference id).
- A single `AppError` taxonomy in `lib/errors.ts` (`auth`, `permission`, `validation`, `not_found`, `conflict`, `network`, `unexpected`); the Supabase/PostgREST error translator lives here and _nowhere else_.
- Mutations: optimistic updates only where reversal is trivial (toggles); everything workflow-related is pessimistic with explicit pending states — an editorial desk must never lie about state.
- 404 for content routes distinguishes "never existed" from "archived" (archived items render with the archive notice per blueprint §4.2.2).

### 5.5 Admin vs. public architecture

One app, two route trees, hard code-split: `router.tsx` lazy-loads the entire admin tree behind the auth gate so no admin code ships in the public bundle (verify with a CI bundle-analysis budget: public entry ≤ 150KB gz per blueprint §7.5). Public content pages hydrate over the pre-rendered snapshots; admin is pure SPA. If admin ever needs to become its own app, the module structure already permits it — do not split in v1.0.

### 5.6 Frontend testing strategy

| Layer                          | Tool                     | Scope                                                                             |
| ------------------------------ | ------------------------ | --------------------------------------------------------------------------------- |
| Pure logic, renderers, schemas | Vitest                   | ProseMirror→HTML renderer gets golden-file tests (archive fidelity depends on it) |
| Hooks/components               | Vitest + Testing Library | module `api/` hooks against mocked PostgREST (msw)                                |
| Critical journeys              | Playwright               | the eight journeys (blueprint §11.4), run against local Supabase with seed data   |
| Accessibility                  | axe in Playwright        | key public + admin pages                                                          |

---

## 6. Development Order Review — Final Dependency Graph

```
[0] Repo + CI + environments + local Supabase
        │
[1] identity  ──────────────┐
        │                   │
[2] authz (roles, perms, RLS harness, pgTAP)
        │                   │
[3] admin (audit log, settings)          ← everything after this is audited from birth
        │
[4] api schema conventions + type generation pipeline
        │
[5] publishing: media → items → workflow → revisions → taxonomies
        │                       │
[6] Frontend foundation (shell, auth, routing, packages/ui)   ← starts in parallel after [2]
        │                       │
[7] Editorial desk (CMS)  ← [5]+[6]
        │
[8] Public website (content surfaces, prerender, contact form) ← [7] produces content
        │
[9] membership (applications → decisions → members → terms → card) ← identity, authz, email
        │
[10] programs (programs → sessions → registration → attendance) ← publishing (descriptions), membership (member_only)
        │
[11] crm (orgs → relationships → interactions → pledges) ← identity; enriches person timeline
        │
[12] hospitality (menus → service periods → reservations → desk board)
        │
[13] analytics (beacon → events → rollups → dashboards) ← consumes all domains; built last, designed first (event names reserved from [5])
```

Two deviations from naive feature order, both deliberate: **admin/audit comes third** (so every subsequent domain is born audited — retrofitting audit is miserable), and **membership precedes programs** (the spec order lists programs first, but `member_only` sessions and member pricing depend on membership existing; programs without membership would ship a stub to rework).

---

## 7. Migration Decision — The Existing Horizons Codebase

The existing project is a Hostinger Horizons-generated React/Vite JSX app: shadcn/ui components, Supabase client wiring, page scaffolds for public/admin/CMS surfaces, and a large body of Horizons platform tooling (visual-editor plugin suite, selection-mode, session-journal, site-pages plugins, PocketBase auth shim). Observed technical debt: no TypeScript; three overlapping page trees (`pages/`, `pages/admin/`, `pages/cms/`, plus `pages/public/`) indicating drifted duplicates (e.g., `Homepage.jsx` in two trees, `Publications.jsx` in three); services layer coupled directly to components; the visual-editor plugin machinery is builder-tool scaffolding, not institutional code; no tests; no migrations directory governing the existing database.

**Decision: Option B — Partial rebuild.** (ADR-34)

What is **kept** (with conversion):

- `packages/ui` seed: the shadcn/Radix component set (`components/ui/*`) is high-quality generated code on solid primitives — convert to TSX, curate, re-token.
- The Supabase project's _data_: existing content/rows are migrated by script into the new schemas; nothing typed in by staff is lost.
- Product knowledge embedded in the page scaffolds — used as reference for information architecture, not as code.

What is **discarded**:

- All Horizons platform plugins (visual-editor, selection-mode, session-journal, site-pages, PocketBase shim) — they serve the builder tool, not PAZ, and are the largest single mass of code in the repo.
- The duplicated page trees and the untyped services layer — rewritten as typed module `api/` hooks.
- The existing ungoverned database schema — replaced by migrations from zero; a one-time `scripts/migrate-legacy-data.ts` moves rows across.

Why not Option A (continue): the foundation this architecture depends on — TypeScript, migrations-as-truth, RLS-first schemas, module boundaries — is absent, and retrofitting all four into a drifted JSX codebase costs more than rebuilding around the salvageable parts, while preserving the debt's shape. Why not Option C (clean rebuild): the UI component layer and the accumulated IA/product decisions are genuinely valuable and rebuilding them is waste. Option B costs roughly 2–3 weeks more than A up front and repays it within the first quarter.

---

## 8. Phase 0 Engineering Plan (weeks 1–4, two senior engineers)

**Exit criterion:** a developer can clone the repo, run `pnpm dev` + `supabase start`, sign in as a seeded admin with a role-gated shell, and CI enforces every standard in this review.

### 8.1 Repository setup (week 1)

- pnpm workspace: `apps/web`, `packages/{ui,types,utils,config}`; Turborepo task graph (`build`, `dev`, `lint`, `typecheck`, `test`).
- `packages/config`: shared `tsconfig` (strict, `noUncheckedIndexedAccess`), ESLint flat config (typescript-eslint strict, `eslint-plugin-boundaries`, jsx-a11y), Prettier, Tailwind preset with PAZ tokens.
- TypeScript migration seed: `apps/web` scaffolded fresh in TS; salvaged `components/ui/*` converted to TSX into `packages/ui` (allow `.tsx` with temporary `any`-boundaries flagged by lint TODO rule, burned down before Phase 1 exit).
- Testing harness: Vitest + Testing Library wired; Playwright installed with one smoke test; pgTAP runner script.
- CI (GitHub Actions): install → lint → typecheck → unit → `supabase start` ephemeral → migrations from zero → pgTAP → `supabase db diff` must be empty → build with bundle budget → Playwright smoke. Secret scanning + `pnpm audit` gates.

### 8.2 Supabase setup (week 1–2)

- Three projects: local (CLI), staging, production. Env promotion documented in `docs/runbooks/environments.md`.
- Migration 0001: extensions (`citext`, `pg_trgm`, `pgcrypto`, `btree_gist`; verify `pg_cron` — T-006 spike), schema shells, comment conventions.
- Seed framework: idempotent seed scripts split `reference` (roles, permissions, tiers — runs everywhere) vs `synthetic` (fake people/content — local+staging only).
- `supabase gen types` wired into `packages/types` with a CI freshness check.
- Backup job v0: nightly `pg_dump` + storage manifest to R2 with encryption; restore-verification script skeleton; DR + restore runbooks drafted (§4 required change).

### 8.3 Database foundation (weeks 2–3)

- `identity`: `people` with all D-1/D-3 semantics — `canonical_person()`, `merge_people()`, `erase_person()`, auth-link trigger, trgm index; pgTAP for merge completeness and erasure invariants.
- `authz`: roles/permissions/user_roles + seed matrix from `docs/authz-matrix.md`; `current_person_id()`, `has_permission()` with the initplan idiom documented; aal2 requirement helper; pgTAP allow/deny harness template every later domain copies.
- `admin`: `audit_log` (append-only grants verified by pgTAP), `settings` with typed registry, generic audit trigger function.
- `api`: schema created; PostgREST exposure restricted to it; view/versioning conventions doc (D-18); first views: `api.my_profile`.

### 8.4 Frontend foundation (weeks 3–4)

- App shell: providers, router with lazy public/admin trees, layouts, error boundaries + `AppError` taxonomy, 404/500 pages in institutional voice.
- Auth: sign-in, session context, `ProtectedRoute` with permission props, MFA enrollment flow for staff, sign-out; against seeded users.
- Permissions hook `usePermission()` reading JWT claims/roles; nav renders from a route manifest with required permissions.
- `packages/ui` v0: tokens (type scale, palette, spacing), Button/Input/Field/Card/Dialog/Table/Badge/Toast curated from salvage; Storybook or Ladle for component review; axe check in CI on the shell.
- Analytics beacon stub (no-op locally) so event names exist from the first feature.

---

## 9. First 100 Engineering Tasks

Priority: P0 = Phase 0 blocker · P1 = Phase 1 critical path · P2 = Phase 1 parallel/Phase 2 start. Dependencies reference task IDs.

| ID    | Task                                                                                  | Domain      | Dep          | Pri |
| ----- | ------------------------------------------------------------------------------------- | ----------- | ------------ | --- |
| T-001 | Init pnpm workspace + Turborepo, package shells                                       | Repo        | —            | P0  |
| T-002 | `packages/config`: strict tsconfig, ESLint (boundaries, a11y), Prettier               | Repo        | T-001        | P0  |
| T-003 | Tailwind preset + PAZ design tokens v0                                                | UI          | T-002        | P0  |
| T-004 | CI pipeline: lint/typecheck/unit skeleton                                             | Repo        | T-002        | P0  |
| T-005 | Supabase CLI local setup, `supabase start` docs                                       | Infra       | T-001        | P0  |
| T-006 | Spike: verify plan tier — PITR, pg_cron, image transforms; record ADR                 | Infra       | T-005        | P0  |
| T-007 | Staging + production Supabase projects, env promotion runbook                         | Infra       | T-006        | P0  |
| T-008 | Migration 0001: extensions + schema shells + comment convention                       | DB          | T-005        | P0  |
| T-009 | CI: migrations-from-zero + `db diff` empty gate                                       | Infra       | T-004, T-008 | P0  |
| T-010 | pgTAP harness + runner script + example test                                          | DB          | T-008        | P0  |
| T-011 | Seed framework: reference vs synthetic split, idempotent                              | DB          | T-008        | P0  |
| T-012 | `identity.people` table + updated_at trigger + trgm index                             | Identity    | T-008        | P0  |
| T-013 | `identity.canonical_person()` + auth-link-on-signin trigger                           | Identity    | T-012        | P0  |
| T-014 | `identity.merge_people()` + FK-completeness pgTAP test                                | Identity    | T-012        | P0  |
| T-015 | `identity.erase_person()` per erasure spec + tests                                    | Identity    | T-012        | P0  |
| T-016 | Erasure policy doc `docs/policies/erasure.md`                                         | Docs        | T-015        | P0  |
| T-017 | `authz` tables (roles, permissions, role_permissions, user_roles)                     | Authz       | T-012        | P0  |
| T-018 | `authz.current_person_id()` + `has_permission()` (initplan idiom)                     | Authz       | T-017        | P0  |
| T-019 | Seed full role/permission matrix + CI sync check vs docs                              | Authz       | T-017        | P0  |
| T-020 | aal2 (MFA) requirement helper + staff-permission convention                           | Authz       | T-018        | P0  |
| T-021 | Spike: image transform strategy (on-the-fly vs on-ingest) → ADR                       | Media       | T-006        | P0  |
| T-022 | `admin.audit_log` append-only + generic audit trigger fn + pgTAP                      | Admin       | T-017        | P0  |
| T-023 | `admin.settings` + typed settings registry in `packages/types`                        | Admin       | T-008        | P0  |
| T-024 | `api` schema + PostgREST exposure config + conventions doc (D-18)                     | API         | T-008        | P0  |
| T-025 | Type generation pipeline → `packages/types` + CI freshness gate                       | Types       | T-012        | P0  |
| T-026 | Nightly backup job v0: pg_dump + manifest → R2, encrypted                             | Infra       | T-007        | P0  |
| T-027 | Restore-verification script + restore runbook draft                                   | Infra       | T-026        | P0  |
| T-028 | DR runbook: decision tree, restore order, auth caveat                                 | Docs        | T-027        | P0  |
| T-029 | App shell: providers, error boundaries, `AppError` taxonomy                           | FE          | T-002        | P0  |
| T-030 | Router: lazy public/admin trees, layouts, 404/500 pages                               | FE          | T-029        | P0  |
| T-031 | Auth UI: sign-in, session context, sign-out                                           | FE          | T-030, T-013 | P0  |
| T-032 | `ProtectedRoute` + `usePermission()` + role-driven nav manifest                       | FE          | T-031, T-019 | P0  |
| T-033 | Staff MFA enrollment flow                                                             | FE          | T-031, T-020 | P0  |
| T-034 | `packages/ui` v0: convert salvaged shadcn set to TSX, curate                          | UI          | T-003        | P0  |
| T-035 | Component workshop (Ladle/Storybook) + axe CI on shell                                | UI          | T-034        | P0  |
| T-036 | Playwright: smoke journey (sign in → gated shell)                                     | QA          | T-032        | P0  |
| T-037 | Analytics beacon stub + event-name registry                                           | Analytics   | T-029        | P0  |
| T-038 | Secret scanning + `pnpm audit` CI gates                                               | Infra       | T-004        | P0  |
| T-039 | Onboarding doc: clone-to-productive in 2 days                                         | Docs        | T-036        | P0  |
| T-040 | `publishing.media` table + storage buckets via migration                              | Publishing  | T-024        | P1  |
| T-041 | `ingest-media` Edge Function: sniff, caps, re-encode, EXIF strip                      | Publishing  | T-040, T-021 | P1  |
| T-042 | Media library admin UI (upload, browse, edit alt/credit)                              | FE          | T-041, T-034 | P1  |
| T-043 | `publishing.items` + enums + indexes + `body_schema_version`                          | Publishing  | T-040        | P1  |
| T-044 | `publishing.item_authors`, `item_relations`, attachments                              | Publishing  | T-043        | P1  |
| T-045 | Taxonomies (categories tree, tags) + `item_terms` + indexes                           | Publishing  | T-043        | P1  |
| T-046 | `transition_item()` state machine + direct-update block trigger                       | Publishing  | T-043, T-022 | P1  |
| T-047 | pgTAP: every legal + illegal transition, permission per edge                          | Publishing  | T-046        | P1  |
| T-048 | `item_revisions` + autosave coalescing (kind: autosave/manual/transition)             | Publishing  | T-043        | P1  |
| T-049 | `publishing.redirects` + slug-change trigger                                          | Publishing  | T-043        | P1  |
| T-050 | ProseMirror v1 schema package (frozen node set, D-7)                                  | Publishing  | T-025        | P1  |
| T-051 | ProseMirror→HTML renderer + golden-file tests                                         | Publishing  | T-050        | P1  |
| T-052 | Body-text extraction fn + FTS tsvector + GIN index                                    | Publishing  | T-050, T-043 | P1  |
| T-053 | RLS: publishing tables (authors own drafts; editors all) + pgTAP                      | Publishing  | T-046        | P1  |
| T-054 | `api.published_items` view + PostgREST verify + perf snapshot                         | API         | T-053        | P1  |
| T-055 | Extension tables: paper/dispatch/pigeon_post details (D-6)                            | Publishing  | T-043        | P1  |
| T-056 | TipTap editor with v1 schema; figure node requires alt                                | FE          | T-050, T-034 | P1  |
| T-057 | Editorial desk: status columns, filters (type, author)                                | FE          | T-054, T-032 | P1  |
| T-058 | Item editor page: metadata, SEO panel, autosave                                       | FE          | T-056, T-048 | P1  |
| T-059 | Review flow UI: inline comments, decision panel, send-back note                       | FE          | T-057        | P1  |
| T-060 | Version history UI: revision list, diff, restore-as-new                               | FE          | T-048        | P1  |
| T-061 | Scheduling UI (Asia/Kathmandu labeled) + `publish-scheduled` job                      | Publishing  | T-046, T-006 | P1  |
| T-062 | Public layout + Homepage assembling published surfaces                                | FE          | T-054, T-030 | P1  |
| T-063 | Content page route: render body, byline, related, archive notice                      | FE          | T-051, T-062 | P1  |
| T-064 | About / Membership / Visit static-content pages via `page` type                       | FE          | T-063        | P1  |
| T-065 | Prerender pipeline: snapshot published pages at deploy                                | Infra       | T-063        | P1  |
| T-066 | Publish-transition → Cloudflare deploy hook                                           | Infra       | T-065, T-046 | P1  |
| T-067 | `send-email` utility + provider decision (deliverability test, ADR-11)                | Infra       | T-007        | P1  |
| T-068 | `contact-message` Edge Fn: Turnstile, rate limit, CRM stub, notify                    | API         | T-067        | P1  |
| T-069 | Contact page + form (shared zod schema pattern established)                           | FE          | T-068        | P1  |
| T-070 | FTS: `api.search_published()` + public search UI                                      | API/FE      | T-052        | P1  |
| T-071 | Lighthouse CI budgets (LCP, JS 150KB) as build gates                                  | Infra       | T-062        | P1  |
| T-072 | Playwright: read-article + full editorial journey                                     | QA          | T-063, T-059 | P1  |
| T-073 | Legacy data migration script: old Supabase rows → new schemas                         | Infra       | T-043, T-011 | P1  |
| T-074 | `membership.tiers` + seed + admin CRUD                                                | Membership  | T-024        | P2  |
| T-075 | `membership.applications` + RLS + pgTAP                                               | Membership  | T-074        | P2  |
| T-076 | `submit-membership-application` Edge Fn (dup-check via D-1)                           | Membership  | T-075, T-067 | P2  |
| T-077 | Public application form + confirmation email                                          | FE          | T-076        | P2  |
| T-078 | Application review queue UI + decision panel                                          | FE          | T-075        | P2  |
| T-079 | `decide-membership-application` + invitation token flow (D-12)                        | Membership  | T-078        | P2  |
| T-080 | `membership.members` + member_no generator + status model (D-4)                       | Membership  | T-079        | P2  |
| T-081 | `membership.terms` + renewal notices job (D-11) + grace logic                         | Membership  | T-080        | P2  |
| T-082 | Finance UI: record payment against term                                               | FE          | T-081, T-032 | P2  |
| T-083 | Digital card: issue + verify Edge Fns + member card page                              | Membership  | T-080        | P2  |
| T-084 | Member directory: opt-in, RLS (active members only), UI                               | Membership  | T-080        | P2  |
| T-085 | `communication_preferences` on people + capture in all forms (D-13)                   | Identity    | T-076        | P2  |
| T-086 | `programs.programs` + `venues` + description via publishing item                      | Programs    | T-043        | P2  |
| T-087 | `programs.sessions` + overlap/validity constraints + indexes                          | Programs    | T-086        | P2  |
| T-088 | `programs.register()` fn: locks, capacity, waitlist + pgTAP race test                 | Programs    | T-087        | P2  |
| T-089 | `register-for-session` Edge Fn + confirmation + waitlist promotion                    | Programs    | T-088, T-067 | P2  |
| T-090 | Public program calendar + program page + register UI                                  | FE          | T-087        | P2  |
| T-091 | Program admin: CRUD, roster, attendance marking (Volunteer role)                      | FE          | T-088        | P2  |
| T-092 | `crm.organizations` + `org_people` + admin UI                                         | CRM         | T-024        | P2  |
| T-093 | `crm.relationships` (kinds, superseded_by, owner) + RLS + pgTAP                       | CRM         | T-092        | P2  |
| T-094 | `crm.interactions` (append-only rule) + `pledges` (D-15 fields)                       | CRM         | T-093        | P2  |
| T-095 | Person timeline view `api.person_timeline` + admin timeline UI                        | CRM         | T-094, T-080 | P2  |
| T-096 | Hospitality: menus/sections/items + publish + public menu page                        | Hospitality | T-024        | P2  |
| T-097 | Reservations: tables, service periods, exclusion constraint, request→confirm Edge Fns | Hospitality | T-096, T-067 | P2  |
| T-098 | Reservation desk board (Realtime convenience) + public request form                   | FE          | T-097        | P2  |
| T-099 | `analytics.events` (monthly partitions) + beacon Edge Fn + rollup job                 | Analytics   | T-037        | P2  |
| T-100 | Role dashboards v1 (editorial, programs, membership, vitals) per D-16                 | Analytics   | T-099, T-095 | P2  |

---

## 10. Final CTO Approval

### Architecture Status: **APPROVED WITH REQUIRED CHANGES**

The architecture is structurally sound. No decision requires redesign. The required changes below are additions and specifications — all are contained in this review and must be merged into the blueprint (as ADR-15 through ADR-34 and schema amendments) before, or during, Phase 0.

### Required Changes Before Coding

1. **Adopt the identity lifecycle specifications** — merge procedure with FK-completeness test, erasure specification, anonymous-visitor rule, former-member status semantics (§2.1 / ADR-15–19).
2. **Specify FK delete semantics and missing constraints** across all schemas per the §3.2 table, including the reservation exclusion constraint and date-range checks.
3. **Ship the index set** (§3.3) with the tables, and partition `analytics.events` by month from migration one.
4. **Adopt the RLS performance discipline** (§3.4) — the initplan idiom and policy-complexity rules — as a written engineering standard checked in review.
5. **Pin `search_path` on every security-definer function**, verified by pgTAP (§3.1).
6. **Add `body_schema_version` to `publishing.items`** and freeze the ProseMirror v1 node set (D-7) before any editor code is written.
7. **Specify the media lifecycle** (D-8): ingest hardening, variant strategy (pending T-021 spike), orphan review, retention.
8. **Adopt the membership renewal/expiry/invitation mechanics** (D-11, D-12) — the domain cannot be built without them.
9. **Write the DR decision-tree runbook** including the auth-restore caveat (§4), and verify plan-tier assumptions (PITR, pg_cron, image transforms) in the T-006 spike — adjust the stated RPO if needed.
10. **Confirm Option B migration** and schedule the legacy-data migration script (T-073) inside Phase 1, not as an afterthought.

### Recommended First Build Step

Phase 0, tasks T-001 → T-011 as a single week-one push by both engineers together: workspace, CI with the migrations-from-zero gate, local Supabase, migration 0001, pgTAP harness, seed framework. **Everything after this inherits its quality from this week.** Do not begin `identity` until CI is red/green trustworthy.

### Recommended First Repository Commit

```
commit 1: "PAZ OS — foundation"

  pnpm-workspace.yaml, turbo.json
  packages/config/          (tsconfig strict, eslint, prettier, tailwind preset)
  apps/web/                 (empty Vite TS shell, builds clean)
  packages/{ui,types,utils}/ (shells)
  supabase/migrations/00000000000001_foundation.sql
      → extensions: citext, pg_trgm, pgcrypto, btree_gist
      → create schema identity, authz, publishing, programs,
        membership, crm, hospitality, admin, analytics, api;
  supabase/tests/00_smoke.sql   (pgTAP: schemas exist)
  .github/workflows/ci.yml      (lint, typecheck, migrate-from-zero, pgTAP, db diff empty)
  docs/adr/001-modular-monolith.md … 034-partial-rebuild.md
  docs/onboarding.md (stub), README.md
```

The first commit contains no features — it contains the _standards_. A repository whose very first commit runs migrations from zero, executes a pgTAP test, and fails CI on schema drift will still be doing so in 2036.

---

_The institution always comes before the software. This review exists so the software can be trusted with the institution._
