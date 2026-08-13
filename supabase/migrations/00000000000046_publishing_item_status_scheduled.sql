-- 0046_publishing_item_status_scheduled.sql
--
-- T-061: `ALTER TYPE ... ADD VALUE` has historically needed to run alone
-- in its own migration with no other DDL (Build Readiness Review §3.6);
-- this repository already follows that rule for every other enum
-- addition (0024, 0039). This migration does only this.
alter type publishing.item_status add value if not exists 'scheduled';
