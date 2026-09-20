-- 0068_publishing_item_type_sattal.sql
--
-- Adds the Sattal to the deposit register's entry types (PAZ Site Build
-- Specification 7.2). Enum values are added in a dedicated migration with
-- no other statements (Build Readiness Review 3.6), same as 0024.
alter type publishing.item_type add value if not exists 'sattal';
