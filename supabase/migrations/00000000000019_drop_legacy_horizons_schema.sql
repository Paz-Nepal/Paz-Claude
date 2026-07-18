-- 0019_drop_legacy_horizons_schema.sql
--
-- Removes the legacy Hostinger Horizons prototype's tables/views from
-- `public` — the pre-existing, ungoverned schema this project's own
-- Build Readiness Review already reviewed and voted to discard in favor
-- of a from-zero, migrations-as-truth rebuild (docs/adr, ADR-34 "Partial
-- rebuild"; see also the Phase 1 audit that first found this schema still
-- present on the linked project). Confirmed abandoned — no code in this
-- repository reads or writes any of these tables; every domain we've built
-- lives in its own named schema (identity, authz, admin, publishing,
-- membership, programs, …), never in `public`.
--
-- Deliberately NOT touched:
-- - public.set_updated_at() / public.audit_row_change() — this project's
--   own shared trigger functions (migrations 0001, 0006), not legacy.
-- - The citext / pg_trgm / btree_gist extensions, which happen to live in
--   `public` (migration 0001's `create extension` with no explicit
--   target schema) — DROP TABLE/VIEW never touches extension objects.
-- - Storage buckets (paz-assets, paz-publications, paz-documents,
--   paz-members) and their objects — a database schema drop and a
--   storage-bucket deletion are different operations with different
--   blast radii (buckets may hold real uploaded files); left for a
--   separate, explicit decision.

drop view if exists
  public.paz_database_health,
  public.public_content,
  public.article_search
cascade;

drop table if exists
  public.analytics_events, public.applications, public.article_authors,
  public.article_blocks, public.article_revisions, public.article_tag_links,
  public.article_tags, public.articles, public.assets, public.audit_logs,
  public.block_types, public.communication_log, public.contact_types,
  public.contacts, public.content_blocks, public.content_views,
  public.conversion_events, public.dietary_labels, public.donations,
  public.donors, public.editorial_comments, public.enquiries,
  public.event_attendance, public.event_feedback, public.event_registrations,
  public.event_speakers, public.events, public.feature_flags,
  public.hospitality_menus, public.ingredients, public.institutional_documents,
  public.internal_notes, public.locations, public.member_engagement,
  public.member_profiles, public.membership_applications,
  public.membership_benefits, public.membership_history,
  public.membership_tiers, public.memberships, public.menu_categories,
  public.menu_item_availability, public.menu_item_dietary_labels,
  public.menu_item_ingredients, public.menu_item_prices, public.menu_items,
  public.navigation_items, public.navigation_menus, public.newsletter_campaigns,
  public.newsletter_deliveries, public.newsletter_subscribers,
  public.organizations, public.page_sections, public.page_views,
  public.pages, public.payments, public.people, public.permissions,
  public.person_organizations, public.profile_roles, public.profiles,
  public.program_applications, public.program_categories,
  public.program_people, public.program_sessions, public.programs,
  public.publication_issues, public.publications, public.receipts,
  public.redirects, public.role_permissions, public.roles,
  public.search_index, public.seo_metadata, public.supplier_products,
  public.suppliers, public.tasks, public.volunteers
cascade;
