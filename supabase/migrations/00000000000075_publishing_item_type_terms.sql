-- 0075_publishing_item_type_terms.sql
--
-- Build Programme 4: the four terms pages are deposited documents with a
-- version history, so they ride the deposit pipeline as their own item
-- type. Dedicated migration, no other statements (Build Readiness Review
-- 3.6), same as 0024 and 0068.
alter type publishing.item_type add value if not exists 'terms';
