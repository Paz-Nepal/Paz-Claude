# PAZ OS v1.0 — Architecture Blueprint

**Document type:** Technical blueprint for implementation by a senior engineering team
**Author role:** CTO / Principal Architect
**Status:** Draft for review
**Horizon:** Designed for a 10+ year operational life within a 100-year institutional perspective

---

## 0. How to Read This Document

This blueprint makes decisions, not suggestions. Where a choice exists, it is made and justified. Where a choice is deferred, the deferral is explicit and dated. Every major decision is recorded as an Architecture Decision Record (ADR) in §14 so future maintainers understand _why_, not just _what_.

The governing constraint, taken from the institutional brief: **the software exists to serve PAZ; PAZ does not exist to serve the software.** Every section below has been tested against that sentence. Features common in other products but without institutional purpose have been deliberately excluded (see §13, Non-Goals).

---

## 1. Architectural Vision

PAZ OS is a single, coherent system with many interfaces. The public website, the editorial desk, the membership office, the program calendar, and the café reservation book are all views into one institutional database.

Three consequences follow:

1. **One canonical record of every person.** A reader who becomes a workshop participant who becomes a member who becomes an author is _one person_ in the system, with one history. This is the single most important data decision in the entire platform, because relationships are the institution's most valuable asset and the system must be able to hold a relationship across decades.

2. **One canonical content lifecycle.** Every published thing — article, paper, dispatch, program description, menu — moves through the same draft → review → approval → publish → archive lifecycle, with the same version history and the same audit trail. Editors learn one workflow, and the archive stays coherent for a hundred years.

3. **The database is the institution's memory.** Application code will be rewritten several times over the coming decades; the data must survive every rewrite. Therefore business rules that protect data integrity (permissions, state transitions, invariants) live _in the database_, and the schema is treated as the most carefully governed artifact in the entire codebase.

### 1.1 Architectural style: modular monolith

PAZ OS v1.0 is a **modular monolith**: one PostgreSQL database organized into strictly separated domain schemas, one frontend monorepo, one deployment unit per tier. It is explicitly **not** microservices.

Rationale: the institution's scale (one city, one building, thousands — not millions — of people) will never require the operational complexity of distributed systems, and a small team maintaining a distributed system for a decade is a recipe for decay. Modularity is achieved through schema boundaries, module ownership rules, and API discipline — not through network boundaries. If a domain ever genuinely needs extraction (e.g., hospitality POS integration at scale), the schema-per-domain design makes that extraction tractable.

### 1.2 Platform posture: Supabase with an exit strategy

Supabase is the backend platform (PostgreSQL, Auth, Storage, Edge Functions, Realtime), per the technical specification. For a 100-year institution, however, no vendor can be assumed permanent. The exit strategy is structural, not aspirational:

- Everything of value lives in **standard PostgreSQL** — schemas, tables, functions, RLS policies — expressible as plain SQL migrations that run on any Postgres.
- Auth stores only credentials; the canonical person record lives in our own `identity` schema.
- Storage objects are mirrored off-platform on a schedule (§12.3).
- Edge Functions are thin Deno/TypeScript handlers with business logic delegated to database functions wherever possible.
- No proprietary Supabase feature is used in a way that cannot be replaced (Realtime is used only for admin conveniences, never for correctness).

**The test:** at any point, the team must be able to restore PAZ OS onto self-hosted Postgres + a generic object store within one week using only the repository and the latest backup.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERFACES                               │
│                                                                 │
│  Public Website        Admin Console         Future Interfaces  │
│  (React SPA/SSG)       (React, /admin)       (mobile, kiosk,    │
│  paz.com.np            role-gated            print pipeline)    │
└────────────┬──────────────────┬─────────────────────────────────┘
             │                  │
             ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER                                 │
│                                                                 │
│  PostgREST (auto)          Edge Functions (Deno)                │
│  via curated views in      workflows with side effects:         │
│  the `api` schema          email, membership review,            │
│                            reservation confirmation, exports    │
└────────────┬──────────────────┬─────────────────────────────────┘
             │                  │
             ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  POSTGRESQL — THE INSTITUTION'S MEMORY          │
│                                                                 │
│  identity │ publishing │ programs │ membership │ crm │          │
│  hospitality │ admin │ analytics │ authz │ api (views)          │
│                                                                 │
│  Row Level Security on every table. State machines and          │
│  invariants enforced by database functions and triggers.        │
└─────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Storage (media) · Auth (credentials) · Realtime       │
│  Nightly off-platform backup: DB dump + storage mirror          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Repository structure (monorepo)

```
paz-os/
├── apps/
│   └── web/                  # Public site + admin console (one app, v1.0)
│       ├── src/
│       │   ├── app/          # Routing, providers, layouts
│       │   ├── modules/      # Feature modules mirroring domains
│       │   │   ├── publishing/
│       │   │   ├── programs/
│       │   │   ├── membership/
│       │   │   ├── crm/
│       │   │   ├── hospitality/
│       │   │   └── admin/
│       │   ├── pages/        # Route components (thin)
│       │   └── lib/          # Supabase client, query client
├── packages/
│   ├── ui/                   # Design system components (no business logic)
│   ├── types/                # Generated DB types + shared domain types
│   ├── utils/                # Pure utilities (dates, formatting, slugs)
│   └── config/               # ESLint, TS, Tailwind shared configs
├── supabase/
│   ├── migrations/           # THE canonical schema. Numbered, immutable.
│   ├── seed/                 # Reference data (roles, permissions, taxonomies)
│   ├── functions/            # Edge Functions
│   └── tests/                # pgTAP tests for RLS and state machines
├── docs/                     # ADRs, runbooks, module docs, onboarding
├── scripts/                  # Backup, export, type generation
└── public/
```

Rules of the repository:

- **`supabase/migrations/` is the source of truth for the schema.** No schema change ever happens through the Supabase dashboard in staging or production. Every migration is reviewed like application code.
- **`packages/types/` is generated** from the database (`supabase gen types typescript`) plus hand-written domain types. The frontend never invents its own shape for a database row.
- **Modules do not import each other's internals.** `modules/publishing` may use `packages/ui` and `packages/types`, but if it needs membership data it goes through the API layer, not through another module's files.
- **TypeScript everywhere.** The existing prototype's `.jsx` files are migrated to `.tsx` as part of v1.0 hardening (§15, Phase 0).

### 2.2 Tooling decisions

| Concern             | Decision                                           | Rationale                                                                        |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Package manager     | pnpm workspaces                                    | Fast, strict, standard for monorepos                                             |
| Build orchestration | Turborepo                                          | Simple task graph, remote caching optional                                       |
| Frontend build      | Vite                                               | Per spec; fast, stable, boring                                                   |
| Data fetching       | TanStack Query                                     | Per spec; cache semantics fit read-heavy site                                    |
| Forms               | react-hook-form + zod                              | Zod schemas shared between client validation and Edge Function validation        |
| Styling             | Tailwind + design tokens in `packages/ui`          | Per spec; tokens keep the calm, editorial aesthetic consistent                   |
| Component base      | Radix primitives (already in prototype via shadcn) | Accessibility built in                                                           |
| DB testing          | pgTAP                                              | RLS policies and state machines must have automated tests                        |
| E2E testing         | Playwright                                         | Critical journeys only (§11.4)                                                   |
| CI                  | GitHub Actions                                     | Lint, typecheck, unit, pgTAP against ephemeral DB, Playwright, migration dry-run |

---

## 3. Identity Architecture — The Person-Centric Model

This is the foundation. Everything else references it.

### 3.1 The core principle

`auth.users` (Supabase Auth) holds **credentials only**. The canonical human record is `identity.people`. Not every person has a login (a donor recorded by staff, a talk speaker, a reservation guest), and not every login is a member. The relationship is:

```
auth.users (0..1) ──── (1) identity.people (1) ──── (0..n) facets:
                                                    membership.members
                                                    publishing.authors
                                                    crm.contacts / roles
                                                    hospitality.reservations
                                                    programs.registrations
```

### 3.2 Identity schema

```sql
create schema identity;

create table identity.people (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  full_name     text not null,
  display_name  text,
  email         citext unique,          -- nullable: some people have no email on file
  phone         text,
  locale        text default 'en',
  avatar_path   text,                   -- storage path, not URL
  bio           text,
  -- lifecycle
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  merged_into   uuid references identity.people(id), -- duplicate resolution, never delete
  deceased_at   date                    -- a 100-year institution records this respectfully
);
```

Key decisions:

- **People are never hard-deleted.** Duplicates are merged via `merged_into` (with a merge procedure that re-points foreign keys); departures are handled by anonymization on request (GDPR-style erasure replaces PII fields with placeholders while preserving referential integrity of the archive — an article's byline history survives even if the person asks to be forgotten from CRM).
- `email` is `citext` and unique where present; it is the natural join key when a person who exists in CRM later creates a login (a trigger links `auth_user_id` on first sign-in by matching verified email).
- Every other domain references `people.id`, never `auth.users.id`.

### 3.3 Roles and authorization (`authz` schema)

Roles are data, not code. Permissions are data, not code. RLS policies call two functions and nothing else.

```sql
create schema authz;

create table authz.roles (
  key         text primary key,   -- 'super_admin', 'administrator', 'editor', ...
  name        text not null,
  description text
);

create table authz.permissions (
  key         text primary key,   -- 'publishing.item.publish', 'membership.application.review'
  description text
);

create table authz.role_permissions (
  role_key       text references authz.roles(key),
  permission_key text references authz.permissions(key),
  primary key (role_key, permission_key)
);

create table authz.user_roles (
  person_id  uuid references identity.people(id),
  role_key   text references authz.roles(key),
  granted_by uuid references identity.people(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,          -- volunteers, temporary access
  primary key (person_id, role_key)
);

-- The only two functions RLS policies are allowed to call:
create function authz.current_person_id() returns uuid ...;   -- auth.uid() → people.id, cached per statement
create function authz.has_permission(p text) returns boolean  -- stable, security definer
  ...;
```

**Role catalog (seeded, per spec §6):**

| Role                | Scope summary                                                                  |
| ------------------- | ------------------------------------------------------------------------------ |
| Super Admin         | Everything, including role grants and settings. Two named humans maximum.      |
| Administrator       | All modules except role administration and destructive settings                |
| Editor              | Full publishing lifecycle including publish/schedule; manage taxonomies        |
| Author              | Create and edit own drafts; submit for review; cannot publish                  |
| Program Manager     | Programs, sessions, registrations, venues                                      |
| Membership Manager  | Applications, renewals, member records, directory moderation                   |
| Hospitality Manager | Menu, reservations, service settings                                           |
| Finance             | Read financial views across membership/CRM; record payments; no content access |
| Volunteer           | Narrow, time-boxed grants (e.g., event check-in) via `expires_at`              |
| Member              | Member-only content, directory (if opted in), own profile, own registrations   |
| Public              | Anonymous read of published content                                            |

**Permission naming convention:** `domain.entity.action` (e.g., `publishing.item.review`, `crm.contact.export`). The full matrix lives in `supabase/seed/authz.sql` and in `docs/authz-matrix.md`, and the two are kept in sync by a CI check.

### 3.4 RLS doctrine

1. **RLS is enabled on every table in every domain schema. No exceptions.** A table with no policy is inaccessible — safe by default.
2. Policies express **who**, database functions express **what is allowed to change** (state machines), triggers express **what must always be true** (invariants). Don't overload RLS with workflow logic.
3. The `service_role` key is used **only** by Edge Functions and scheduled jobs, never shipped to any client, and every service-role code path re-checks authorization explicitly via `authz.has_permission` against the acting person passed in the verified JWT.
4. Public read access goes through **views in the `api` schema**, not raw tables — a published article view exposes the byline and body, not the internal review notes column. PostgREST is configured to expose only `api`.
5. Every policy has a pgTAP test asserting both the allow case and the deny case. RLS without tests is a liability, not a control.

---

## 4. Database Architecture

### 4.1 Domain schemas

One PostgreSQL database, ten schemas. Each domain owns its tables, functions, and triggers; cross-domain writes happen only through the owning domain's functions.

| Schema        | Owns                                                               | May reference                                                 |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `identity`    | people, profiles                                                   | auth                                                          |
| `authz`       | roles, permissions, grants                                         | identity                                                      |
| `publishing`  | items, revisions, authorship, taxonomies, media links              | identity                                                      |
| `programs`    | programs, sessions, venues, registrations, attendance              | identity, publishing (program descriptions are content items) |
| `membership`  | tiers, applications, members, renewals, benefits, cards            | identity, crm                                                 |
| `crm`         | organizations, contact roles, relationships, interactions, pledges | identity                                                      |
| `hospitality` | menus, menu items, service periods, tables, reservations           | identity                                                      |
| `admin`       | audit log, settings, jobs                                          | all (read), none (write into others)                          |
| `analytics`   | events, daily rollups                                              | none (append-only sink)                                       |
| `api`         | views + RPC functions exposed to PostgREST                         | all (read via views)                                          |

Conventions applied uniformly:

- Primary keys: `uuid` (`gen_random_uuid()`), never sequential integers exposed publicly.
- `created_at` / `updated_at` (trigger-maintained) on every table.
- Soft archival via status columns; hard deletes only for genuinely transient rows (unconfirmed reservations past expiry).
- All timestamps `timestamptz`, stored UTC; Nepal Time (UTC+5:45) is a display concern only. Getting this wrong in a Kathmandu institution creates decades of off-by-5:45 bugs.
- Human-readable identifiers (slugs, membership numbers, reservation codes) are separate columns with unique constraints, generated by database functions so every interface gets the same behavior.
- Money: `numeric(12,2)` plus `currency char(3)` (NPR default). Never floats.

### 4.2 Publishing domain — the unified content model

**Decision: single content core + per-type extensions**, not one table per format. Articles, PAZ Papers, Dispatch issues, and Pigeon Post editions share ~90% of their behavior (workflow, versioning, SEO, taxonomy, authorship). The 10% that differs lives in extension tables.

```sql
create schema publishing;

create type publishing.item_type as enum
  ('article', 'paz_paper', 'dispatch', 'pigeon_post', 'page', 'program_note', 'menu_page');

create type publishing.item_status as enum
  ('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');

create table publishing.items (
  id              uuid primary key default gen_random_uuid(),
  type            publishing.item_type not null,
  status          publishing.item_status not null default 'draft',
  slug            text not null,
  title           text not null,
  subtitle        text,
  summary         text,                      -- dek / standfirst
  body            jsonb,                     -- portable structured document (see 4.2.1)
  featured_image  uuid references publishing.media(id),
  language        text not null default 'en',
  reading_minutes int,
  -- workflow
  created_by      uuid not null references identity.people(id),
  submitted_at    timestamptz,
  reviewed_by     uuid references identity.people(id),
  approved_by     uuid references identity.people(id),
  scheduled_for   timestamptz,
  published_at    timestamptz,
  archived_at     timestamptz,
  -- seo
  seo_title       text,
  seo_description text,
  canonical_url   text,
  noindex         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (type, slug)
);

create table publishing.item_authors (
  item_id    uuid references publishing.items(id),
  person_id  uuid references identity.people(id),
  role       text not null default 'author',   -- author, editor, translator, photographer
  position   int not null default 1,
  primary key (item_id, person_id, role)
);

create table publishing.item_revisions (        -- immutable snapshots
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references publishing.items(id),
  revision_no int not null,
  snapshot    jsonb not null,                   -- full item state at save
  saved_by    uuid not null references identity.people(id),
  saved_at    timestamptz not null default now(),
  note        text,
  unique (item_id, revision_no)
);

create table publishing.taxonomies (...);        -- categories (curated tree) + tags (flat)
create table publishing.item_terms (...);
create table publishing.item_relations (         -- related content, explicit and curated
  item_id uuid, related_item_id uuid, relation text default 'related', position int
);
create table publishing.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  kind text not null,                            -- image, document, audio, video
  title text, alt_text text, caption text, credit text,
  width int, height int, bytes bigint, mime text,
  uploaded_by uuid references identity.people(id),
  created_at timestamptz not null default now()
);
create table publishing.item_attachments (item_id uuid, media_id uuid, position int, label text);
```

#### 4.2.1 Body format: portable structured content

The body is stored as **structured JSON (ProseMirror/TipTap document schema)**, not raw HTML and not Markdown.

Rationale: HTML rots (embedded styling, editor artifacts); Markdown cannot express editorial needs (pull quotes, footnotes, image credits, side notes). A constrained ProseMirror schema gives a clean editing experience now and — critically for longevity — a machine-readable archive that can be re-rendered to any future format (web, print, ePub, whatever exists in 2060). A rendering package in `packages/utils` converts the document to HTML server-side for SEO snapshots and to React nodes on the client. The allowed node set is deliberately small: paragraphs, headings 2–4, blockquote, pull quote, figure (with credit), footnote, list, rule, embed (whitelisted providers only).

#### 4.2.2 Workflow state machine — enforced in the database

Status can only change through one function; direct `update ... set status` is blocked by trigger.

```sql
create function publishing.transition_item(
  p_item uuid, p_to publishing.item_status, p_note text default null
) returns publishing.items ...
```

Allowed transitions and required permission:

| From      | To        | Requires                                   | Side effects                                      |
| --------- | --------- | ------------------------------------------ | ------------------------------------------------- |
| draft     | in_review | author of item OR `publishing.item.review` | `submitted_at` set, editors notified              |
| in_review | draft     | reviewer                                   | review note required                              |
| in_review | approved  | `publishing.item.approve`                  | `approved_by` set                                 |
| approved  | scheduled | `publishing.item.publish`                  | `scheduled_for` required, future                  |
| approved  | published | `publishing.item.publish`                  | `published_at = now()`, revision snapshot         |
| scheduled | published | system job (pg_cron, minutely)             | as above                                          |
| published | archived  | `publishing.item.publish`                  | remains readable at permalink with archive notice |
| any       | draft     | `publishing.item.approve`                  | new revision, unpublish rules apply               |

Every transition writes to `admin.audit_log` and creates a revision snapshot. **Published URLs are permanent**: slug changes after publication create a redirect row (`publishing.redirects`), never a broken link. An institution's archive earns trust by never 404ing.

### 4.3 Programs domain

```sql
create schema programs;

create table programs.programs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('talk','workshop','field_study','studio','series','community')),
  title text not null,
  slug text not null unique,
  description_item uuid references publishing.items(id),  -- rich description IS a content item
  status text not null default 'draft',                    -- same lifecycle vocabulary
  capacity_default int,
  member_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table programs.sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs.programs(id),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  venue_id  uuid references programs.venues(id),
  capacity  int,
  status    text not null default 'scheduled'  -- scheduled, cancelled, completed
);

create table programs.registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references programs.sessions(id),
  person_id  uuid not null references identity.people(id),
  status text not null default 'confirmed',    -- confirmed, waitlisted, cancelled, attended, no_show
  registered_at timestamptz not null default now(),
  unique (session_id, person_id)
);
```

Capacity and waitlist are enforced by a registration function (`programs.register(session, person)`) that runs with row locks — two people cannot take the last seat concurrently. Attendance marking at the door is a Volunteer-role capability. Attendance history feeds the person timeline (§6.3) and analytics — participation, not page views, is the metric this institution cares about.

### 4.4 Membership domain

Membership is commitment, not a product. The model reflects that: an **application → review → invitation → membership** flow, with renewal as reaffirmation.

```sql
create schema membership;

create table membership.tiers (
  key text primary key, name text not null, description text,
  annual_fee numeric(12,2), currency char(3) default 'NPR',
  benefits jsonb, active boolean default true, position int
);

create table membership.applications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references identity.people(id),
  tier_key text not null references membership.tiers(key),
  statement text,                                -- why they wish to join
  status text not null default 'submitted',      -- submitted, in_review, invited, accepted, declined, withdrawn
  reviewed_by uuid references identity.people(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table membership.members (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references identity.people(id),
  member_no text not null unique,                -- e.g. PAZ-0001, function-generated, permanent
  tier_key text not null references membership.tiers(key),
  status text not null default 'active',         -- active, lapsed, paused, resigned, honorary
  joined_on date not null,
  directory_opt_in boolean not null default false,
  directory_blurb text
);

create table membership.terms (                   -- each membership year
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references membership.members(id),
  starts_on date not null, ends_on date not null,
  fee numeric(12,2), currency char(3) default 'NPR',
  paid_at timestamptz, payment_ref text, recorded_by uuid references identity.people(id)
);
```

Decisions:

- **Member numbers are permanent and sequential per a database function** — a member who lapses and returns keeps their number. Small detail, large institutional meaning.
- **Digital card**: an Edge Function issues a signed token (short-lived JWT with member_no, name, tier, expiry) rendered as a QR on the member's profile page; door/desk verification is a tiny Edge Function that checks the signature and current status. No third-party wallet dependency in v1.0; Apple/Google Wallet passes are a later additive layer.
- **Payments in v1.0 are recorded, not processed.** Nepal's payment landscape (eSewa, Khalti, bank transfer, cash at the desk) is handled operationally; Finance records payments against terms. Online payment processing is Phase 3 (§15) — deliberately deferred rather than half-built.
- **Directory is opt-in and member-visible only**, moderated by the Membership Manager. RLS: `directory_opt_in = true` rows readable by role Member and above.

### 4.5 CRM domain

**Decision: partners, sponsors, and donors are relationship types, not separate tables.** The entities are people and organizations; the institutional relationships are data.

```sql
create schema crm;

create table crm.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, kind text,                 -- company, ngo, embassy, university, media...
  website text, notes text,
  created_at timestamptz not null default now()
);

create table crm.org_people (                     -- who belongs to / represents what
  org_id uuid references crm.organizations(id),
  person_id uuid references identity.people(id),
  role text,                                      -- 'director', 'liaison'
  primary key (org_id, person_id)
);

create table crm.relationships (                  -- PAZ's relationship with a party
  id uuid primary key default gen_random_uuid(),
  party_person uuid references identity.people(id),
  party_org    uuid references crm.organizations(id),
  kind text not null check (kind in ('partner','sponsor','donor','vendor','press','institutional')),
  status text not null default 'active',
  starts_on date, ends_on date,
  owner_person uuid references identity.people(id),  -- staff steward of the relationship
  summary text,
  check (num_nonnulls(party_person, party_org) = 1)
);

create table crm.interactions (                   -- the institutional memory of relationships
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid references crm.relationships(id),
  person_id uuid references identity.people(id),  -- who at PAZ / who was met
  kind text not null,                             -- meeting, email, call, visit, gift
  occurred_at timestamptz not null,
  notes text,
  recorded_by uuid not null references identity.people(id)
);

create table crm.pledges (                        -- donations & sponsorships
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references crm.relationships(id),
  amount numeric(12,2), currency char(3) default 'NPR',
  kind text not null,                             -- donation, sponsorship, in_kind
  pledged_on date, received_on date,
  restricted_to text,                             -- program restriction, if any
  recorded_by uuid references identity.people(id)
);
```

CRM data is the most sensitive data in the system. RLS: readable only by Administrator, Membership Manager (people-side), Finance (pledges), and the relationship's `owner_person`. Interaction notes are never exposed through the `api` schema's public surface. Export of contacts requires the explicit `crm.contact.export` permission and is audit-logged with row counts.

### 4.6 Hospitality domain

```sql
create schema hospitality;

create table hospitality.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique,
  status text not null default 'draft',           -- same lifecycle vocabulary
  valid_from date, valid_to date
);
create table hospitality.menu_sections (menu_id uuid, name text, position int, ...);
create table hospitality.menu_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references hospitality.menu_sections(id),
  name text not null, description text,
  price numeric(12,2), currency char(3) default 'NPR',
  dietary jsonb,                                  -- veg, vegan, gluten_free, contains: []
  available boolean not null default true,
  position int
);

create table hospitality.service_periods (        -- lunch, evening, event closure
  id uuid primary key default gen_random_uuid(),
  weekday int,                                    -- 0-6, null = date override
  on_date date,
  opens time not null, closes time not null,
  seating_interval_minutes int not null default 30,
  closed boolean default false
);

create table hospitality.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null, seats int not null, zone text, active boolean default true
);

create table hospitality.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                      -- human-friendly, e.g. 'PZ-7F3K'
  person_id uuid references identity.people(id),  -- linked when known; walk-in guests get a light person record
  guest_name text not null, guest_phone text, guest_email citext,
  party_size int not null check (party_size between 1 and 20),
  starts_at timestamptz not null,
  duration_minutes int not null default 90,
  status text not null default 'requested',       -- requested, confirmed, seated, completed, cancelled, no_show
  table_id uuid references hospitality.tables(id),
  notes text, occasion text,
  created_at timestamptz not null default now()
);
```

Reservation flow (v1.0): public form → `requested` → Hospitality Manager confirms (capacity view shows conflicts) → confirmation email via Edge Function. Auto-confirmation with hard capacity math is Phase 3; starting with human confirmation matches both the hospitality philosophy (a person welcomes you, not an algorithm) and operational reality. Inventory is explicitly out of scope for v1.0 per the spec; the schema leaves room (menu_items are stable entities that inventory can later reference).

### 4.7 Administration domain

```sql
create schema admin;

create table admin.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor uuid references identity.people(id),      -- null = system job
  action text not null,                           -- 'publishing.item.publish'
  entity_schema text, entity_table text, entity_id uuid,
  before jsonb, after jsonb,                      -- diff payloads, PII-minimized
  context jsonb                                   -- ip, user agent, edge function name
);
```

- Audit rows are written by triggers on sensitive tables (authz grants, membership decisions, CRM changes, publish transitions, settings) and by every Edge Function.
- Audit log is **append-only**: no update/delete grants for anyone, including Super Admin; retention is permanent (it is institutional memory), with PII-minimization at write time rather than deletion later.
- `admin.settings` is a typed key-value table (validated by a settings registry in code) for institutional configuration: site metadata, email sender identities, reservation defaults. No secrets — secrets live in Supabase Vault / environment configuration.

### 4.8 Analytics domain — privacy-respecting by design

The institutional brief is explicit: the goal is not clicks or engagement. Analytics answers institutional questions: _Is the publishing read? Are programs full? Is membership healthy? Do people return?_

Decisions:

- **No third-party trackers, no ad-tech, no cookies for analytics.** First-party, cookieless page counting only (a tiny beacon to an Edge Function writing to `analytics.events` with truncated/rotating visitor hashes — no IP storage, no cross-site anything).
- `analytics.events` is append-only and rolled up nightly into `analytics.daily_*` tables (page views by item, registrations by program, membership funnel, reservation load). Raw events are pruned after 90 days; rollups are permanent.
- The richer signals come from **first-party participation data**, which the system already has: registrations, attendance, renewals, submissions. Dashboards (§7.4) draw primarily from these.
- If leadership wants deeper web analytics later, self-hosted Plausible/Umami is the sanctioned path — never Google Analytics. This is recorded as ADR-9.

---

## 5. API Architecture

### 5.1 Two-lane API

**Lane 1 — PostgREST (reads and simple writes).** PostgREST is configured to expose **only the `api` schema**. The `api` schema contains curated views and RPC functions; raw domain tables are never exposed. Examples:

- `api.published_items` — published content with byline names, taxonomy, featured image URL; excludes workflow columns and internal notes.
- `api.program_calendar` — upcoming public sessions with remaining-capacity flags (boolean "limited/available/full", never exact counts publicly).
- `api.current_menu` — the active published menu.
- `api.my_profile`, `api.my_registrations`, `api.member_directory` — RLS-scoped member surfaces.

This gives three layers of defense for public data: schema exposure, view shape, RLS.

**Lane 2 — Edge Functions (workflows with side effects).** Anything that sends email, issues tokens, touches money, or coordinates multi-step state:

| Function                                      | Purpose                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `submit-membership-application`               | Validates (zod), creates/links person, creates application, emails applicant + manager |
| `decide-membership-application`               | Invitation/decline, member record creation, member number issuance                     |
| `issue-member-card`                           | Signed QR token                                                                        |
| `verify-member-card`                          | Signature + status check (used at desk)                                                |
| `request-reservation` / `confirm-reservation` | Reservation lifecycle + email                                                          |
| `register-for-session`                        | Wraps `programs.register()` DB function, confirmation email, waitlist promotion        |
| `contact-message`                             | Public contact form → CRM interaction + notification (rate-limited, spam-filtered)     |
| `publish-scheduled`                           | pg_cron-invoked publisher for scheduled items                                          |
| `nightly-rollups`, `nightly-backup-export`    | Scheduled jobs                                                                         |

Edge Function doctrine: validate input with shared zod schemas; do the work by calling a database function inside a transaction; write an audit row; keep functions under ~200 lines; no business rules that exist only in TypeScript.

### 5.2 Email

All outbound email goes through one internal `send-email` utility wrapping a provider (Resend or Postmark; decide on deliverability testing from Nepal — ADR-11). Every template is versioned in the repo, written in the institutional voice (clear, warm, no urgency theater), and every send is logged to `admin.audit_log`. No marketing automation platform in v1.0; the Dispatch/newsletter send pipeline is Phase 2 and reuses the same infrastructure with per-recipient unsubscribe tokens.

### 5.3 Realtime

Used sparingly, for admin conveniences only: live reservation board for the hospitality desk, review-queue updates for editors. Never used for data correctness — everything must be right on refresh.

---

## 6. Admin Console & CMS Design

### 6.1 Structure

One React application (`apps/web`), with `/admin/*` routes gated by `ProtectedRoute` + role checks and lazy-loaded so the public bundle carries zero admin code. Navigation shows only modules the person's roles permit (defense in depth: UI hides, RLS enforces).

Admin modules mirror domains: Dashboard, Publishing (desk), Programs, Membership, CRM, Hospitality, Media, People & Roles, Settings, Audit.

### 6.2 The editorial desk

The publishing UI should feel like a publishing house, not a marketing tool:

- **Desk view**: columns by workflow state (Drafts / In Review / Approved / Scheduled / Published), filterable by format and author.
- **Editor**: TipTap with the constrained schema (§4.2.1); distraction-free writing surface; autosave to draft revisions every 30s of idle; explicit "Save revision" with note.
- **Review**: inline comments on the draft (stored against revision + position), a review decision panel, and required note on send-back.
- **Version history**: revision list with visual diff and one-click restore (restore creates a new revision; history is never rewritten).
- **SEO panel**: title/description with length guidance, canonical, noindex; social preview render.
- **Scheduling**: date-time picker in Asia/Kathmandu with explicit timezone label.

### 6.3 The person timeline

Every person's admin page shows one chronological timeline assembled across domains: joined as member, attended workshop X, authored paper Y, reserved for four, renewed, met with staff Z. This single screen is the institutional-memory payoff of the person-centric model, and it is the primary CRM instrument. (Read access respects domain RLS — a Hospitality Manager sees reservation history, not donation history.)

### 6.4 Dashboards

Per-role landing dashboards fed by `analytics.daily_*` and live domain queries: editorial pipeline health, program fill rates, membership funnel and renewal cohort, reservation load, and a small "institution vitals" panel for administrators. No vanity charts; every number must support a decision someone actually makes.

---

## 7. Frontend Architecture (Public Site)

### 7.1 Rendering strategy

v1.0 ships the React SPA on Cloudflare Pages, with two mitigations for the SPA's SEO/first-paint weaknesses:

1. **Pre-rendering of published content** at deploy/publish time: a build hook renders published item pages to static HTML snapshots (title, meta, article body from the ProseMirror→HTML renderer) served by Cloudflare Pages, with React hydrating on top. Implemented via a `scripts/prerender` step hitting `api.published_items`.
2. **Publish-triggered redeploys**: the `publish-scheduled` / publish transition calls the Cloudflare deploy hook so the static layer is never stale by more than minutes.

This gets institutional-grade SEO and speed without adopting a meta-framework. If the team later prefers a framework, the API-first design means the frontend is replaceable without touching the backend (that optionality is the point of headless). Recorded as ADR-6.

### 7.2 Data layer

- One Supabase client instance; all reads through typed TanStack Query hooks per module (`usePublishedItems`, `useProgramCalendar`).
- Query keys namespaced by domain; cache invalidation rules documented per module.
- Generated DB types are the only source of row shapes; a CI step fails if generated types drift from migrations.

### 7.3 Design system (`packages/ui`)

The existing shadcn/Radix component set from the prototype is adopted and curated into `packages/ui` with PAZ design tokens: a restrained palette, an editorial type scale (serif for reading surfaces, humanist sans for UI), generous whitespace, minimal motion. Rules: components are presentation-only; no data fetching inside `packages/ui`; every component documented with usage guidance; dark mode deferred (calm > features).

### 7.4 Accessibility (WCAG 2.1 AA — a requirement, not an aspiration)

- Radix primitives for all interactive patterns (focus management, ARIA baked in).
- CI runs axe-core against key pages; contrast checked at the token level so it cannot regress per-component.
- Full keyboard operability of the admin console is a launch gate — editorial staff live in this tool.
- Alt text is a required field on media used in published content (enforced at publish transition, not just in UI).
- Reading surfaces: user-respecting defaults — honors `prefers-reduced-motion`, readable line lengths (~65ch), no autoplaying anything.

### 7.5 Performance budgets

| Surface             | Budget                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Public content page | LCP < 2.0s on mid-range Android over 4G (the realistic Kathmandu baseline), JS < 150KB gz on first load |
| Images              | Responsive `srcset` from Supabase image transforms; lazy below the fold; dimensions always set          |
| Admin               | Interactive < 3s; route-level code splitting                                                            |

Budgets are enforced in CI with Lighthouse CI; a budget regression fails the build. Nepal's mobile-network reality makes this a first-class constraint, matching the spec's mobile-first principle.

---

## 8. Security Architecture

### 8.1 Threat model (summary)

Assets: personal data (members, CRM, donors), institutional archive integrity, availability of public site. Principal threats: credential compromise of staff accounts, public-form abuse (spam, injection), data exfiltration via over-broad API exposure, privilege escalation, supply-chain compromise, and simple human error by well-meaning staff.

### 8.2 Controls

| Layer           | Controls                                                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication  | Supabase Auth; email+password with strong policy; **TOTP MFA mandatory for all staff roles** (enforced by an RLS check on staff-permission use requiring `aal2`); magic-link allowed for Member role only; session lifetime 12h staff / 30d member |
| Authorization   | RLS everywhere (§3.4); permission checks in DB functions; `service_role` confined to Edge Functions; quarterly access review of `authz.user_roles` (a runbook, on the calendar)                                                                    |
| Input           | zod validation at every Edge Function; parameterized SQL only; ProseMirror schema whitelist eliminates stored-XSS vectors in content; strict CSP (no `unsafe-inline`), HSTS, frame-ancestors none                                                  |
| Public forms    | Cloudflare Turnstile + per-IP and per-email rate limits in Edge Functions; contact/application/reservation forms all covered                                                                                                                       |
| Storage         | Private buckets by default; public bucket only for published media; signed URLs for member documents; uploads restricted by MIME + size, images re-encoded on ingest                                                                               |
| Secrets         | Supabase Vault + CF Pages env; never in repo; rotation runbook; separate keys per environment                                                                                                                                                      |
| Supply chain    | pnpm lockfile, Renovate for updates, `pnpm audit` gate in CI, no post-install scripts without review                                                                                                                                               |
| Auditability    | §4.7 audit log; alerts on anomalies (role grant, bulk export, >N failed logins)                                                                                                                                                                    |
| Data protection | PII minimization, anonymization procedure (§3.2), TLS everywhere, backups encrypted at rest                                                                                                                                                        |

### 8.3 Environments

`local` (Supabase CLI, seeded synthetic data) → `staging` (separate Supabase project, anonymized data only — **production PII never leaves production**) → `production`. Migrations promote through all three; deploys to production happen from CI only, from `main`, after all gates.

---

## 9. Reliability, Backups, and Institutional Continuity

For a 100-year institution, continuity planning outranks feature velocity.

- **RPO 24h / RTO 1 week for full platform loss; RTO 4h for ordinary incidents.**
- Supabase PITR enabled (7-day window) for operational mistakes ("an editor bulk-deleted tags").
- **Nightly off-platform export** (`nightly-backup-export`): `pg_dump` of all schemas + storage manifest + incremental storage mirror, encrypted, to a second provider (e.g., Cloudflare R2) under an account with separate credentials. Vendor risk and account-compromise risk must not share a fate.
- **Quarterly restore drill**: restore the latest export to a scratch Postgres, run a verification script (row counts, referential integrity, sample content render). A backup that has never been restored is a hope, not a backup. Runbook in `docs/runbooks/restore.md`.
- **Annual archive snapshot**: a self-contained static HTML export of all published content, deposited offline. If everything else fails, the intellectual output survives as plain files.
- Uptime monitoring (public site, API, auth) with alerting to staff; status transparency handled with a simple status note process, not a marketing-grade status page.

---

## 10. Observability & Operations

- **Errors**: Sentry (frontend + Edge Functions), PII-scrubbed.
- **Logs**: structured JSON in Edge Functions (request id, actor person id, action); Supabase log drains reviewed via saved queries.
- **Metrics that matter**: publish latency, form failure rates, email delivery rates, job success (scheduled publisher, rollups, backups — a failed backup pages someone).
- **Runbooks** in `docs/runbooks/`: restore, key rotation, staff offboarding, incident response, "the scheduled publisher didn't run," "email is bouncing."
- **On-call is informal but defined**: one named owner per week for alerts; this is a cultural institution, not a pager factory — alert only on things that need a human today.

---

## 11. Quality Engineering

1. **pgTAP** — every RLS policy (allow + deny), every state-machine transition (legal + illegal), invariant triggers. This is the highest-value test suite in the system.
2. **Unit tests (Vitest)** — rendering of the content document, utilities, zod schemas.
3. **Integration tests** — Edge Functions against local Supabase.
4. **E2E (Playwright)** — the eight critical journeys: read an article; browse programs and register; apply for membership; staff reviews and publishes an item; staff decides an application; request and confirm a reservation; member views card and directory; admin grants a role (and audit shows it).
5. **CI gates**: typecheck, lint, unit, pgTAP, migration dry-run against a copy of the staging schema, Lighthouse budgets, axe checks. All green before merge to `main`.

Definition of done for any feature: migration + RLS + pgTAP tests + typed API surface + UI + docs page updated.

---

## 12. Documentation & Governance

- **ADRs** (`docs/adr/NNN-title.md`): short, immutable records of every significant decision. Superseding requires a new ADR referencing the old.
- **Module docs**: one page per domain — purpose, schema diagram, key functions, RLS summary, owned Edge Functions.
- **The authz matrix** (`docs/authz-matrix.md`) kept in CI-checked sync with seed data.
- **Onboarding doc**: a new senior engineer should be productive in two days using only the repo and docs.
- **Data dictionary**: generated from database comments (`comment on table/column` is mandatory in migrations), so documentation cannot drift from the schema.
- **Change management**: schema changes require review by the designated data steward; anything touching `identity`, `authz`, or `crm` requires two reviewers.

---

## 13. Non-Goals for v1.0 (deliberate exclusions)

Excluded because they serve engagement rather than the institution, or belong to a later phase:

- Comments, likes, reactions, share counters, gamification of any kind — permanently out, per the institutional brief.
- Push notifications, growth pop-ups, exit-intent modals — permanently out.
- Online payment processing — Phase 3 (recorded, not processed, until then).
- Inventory management — future, per spec.
- Multi-language content — schema is ready (`language` column, slug uniqueness per type); UI and workflow deferred.
- Native mobile apps — the mobile-first web experience is the mobile strategy for v1.x.
- Full-text search — v1.0 ships Postgres FTS on published items (title, summary, body text extraction); a dedicated search service is unnecessary at this corpus size.

---

## 14. Architecture Decision Records (summary register)

| ADR | Decision                                                              | Key rationale                                                              |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Modular monolith on one Postgres                                      | Team size, longevity, extraction remains possible via schema boundaries    |
| 2   | Person-centric identity; auth = credentials only                      | One relationship per human across decades; portability                     |
| 3   | Roles/permissions as data; RLS calls `authz.*` only                   | Auditable, testable, evolvable without code deploys                        |
| 4   | Unified content core + type extensions                                | One workflow, one archive, 90% shared behavior                             |
| 5   | ProseMirror JSON body, constrained schema                             | Longevity of the archive; re-renderable to future formats; XSS containment |
| 6   | SPA + pre-rendered published pages on CF Pages                        | Spec stack honored; SEO/perf mitigated; frontend replaceable later         |
| 7   | State machines enforced in DB functions                               | Rules survive frontend rewrites; concurrency-safe                          |
| 8   | Payments recorded, not processed, in v1.0                             | Nepal payment reality; avoid half-built financial code                     |
| 9   | First-party, cookieless analytics only                                | Institutional values; privacy; the real metrics are participation data     |
| 10  | Nightly off-platform encrypted export + quarterly restore drill       | Vendor-independent continuity; RPO/RTO commitments                         |
| 11  | Single transactional email provider behind internal utility           | Voice consistency, auditability; provider swappable                        |
| 12  | CRM parties = people/orgs; partner/sponsor/donor = relationship kinds | Models reality; prevents duplicate person records                          |
| 13  | No dashboard schema edits; migrations only                            | Schema is the most governed artifact                                       |
| 14  | TypeScript migration of prototype as Phase 0                          | Ten-year maintainability starts now                                        |

---

## 15. Delivery Roadmap

**Phase 0 — Foundation (weeks 1–4).** Monorepo restructure; TypeScript migration of the existing prototype; `identity` + `authz` schemas with seed matrix; RLS doctrine + pgTAP harness; CI pipeline; environments; backup job. _Nothing user-visible; everything load-bearing._

**Phase 1 — Publishing & Public Site (weeks 4–10).** Publishing schema, workflow, revisions; editorial desk with TipTap editor; media library hardening; public site pages (Home, About, Membership, Visit, Contact) and content surfaces; pre-render pipeline; contact form; launch gate: accessibility + performance budgets green.

**Phase 2 — Programs & Membership (weeks 10–16).** Programs schema + calendar + registration with capacity/waitlist; membership application → decision flow; member records, terms, digital card; member-only content and directory; Dispatch email sending; person timeline v1.

**Phase 3 — CRM, Hospitality, Analytics (weeks 16–22).** CRM relationships, interactions, pledges; reservation flow with desk board; menu publishing; analytics beacon + rollups + dashboards; audit surfacing in admin; online payments evaluation (eSewa/Khalti) and, if approved, integration behind the existing `terms` model.

**Phase 4 — Hardening & Handover (weeks 22–26).** Restore drill #1; security review + access review; documentation completion; performance pass; operational handover; v1.0 tagged.

Sequencing principle: each phase ships something the institution can _use_, and no phase builds on unhardened foundations.

---

## 16. Closing Note to the Engineering Team

You are not building a website. You are building the memory and the workflow of an institution that intends to outlive everyone reading this document. When a decision is ambiguous, prefer the boring choice, the standard choice, the documented choice. Optimize for the engineer maintaining this in 2036, and for the archivist opening the export in 2076.

The institution always comes before the software.
