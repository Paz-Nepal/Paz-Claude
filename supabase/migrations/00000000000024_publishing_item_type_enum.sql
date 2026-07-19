-- 0024_publishing_item_type_enum.sql
--
-- PAZ Website & CMS spec: two more named series join the item_type enum
-- (paper/dispatch/pigeon_post already existed; article/page predate this
-- spec and are kept — 'page' covers institutional pages, 'article' is
-- left in place for now rather than dropped, since removing an enum
-- value is not reversible the way adding one is, and nothing in the spec
-- forbids a general-writing surface existing alongside the named series).
--
-- Enum value additions get their own migration with no other statements
-- (Build Readiness Review §3.6 — historical Postgres footgun with enum
-- ALTER inside a transaction that does anything else).

alter type publishing.item_type add value if not exists 'brief';
alter type publishing.item_type add value if not exists 'annual';
alter type publishing.item_type add value if not exists 'event';
