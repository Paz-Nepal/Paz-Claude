-- 0072_blank_site_tagline.sql
--
-- Build Specification 15: the house's own description of itself is
-- blocked, "on the home page and as the fallback description. Leave the
-- field empty." Migration 0008 seeded site.tagline with retired brand
-- language ("A hospitality-led cultural institution in Kathmandu.") that
-- was still being served live. The setting is emptied, not reworded: the
-- house supplies the real words when it is ready, through the console.
update admin.settings set value = '""'::jsonb where key = 'site.tagline';
