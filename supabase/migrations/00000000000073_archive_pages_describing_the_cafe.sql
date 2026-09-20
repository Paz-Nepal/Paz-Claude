-- 0073_archive_pages_describing_the_cafe.sql
--
-- Build Specification 5 and 15: nothing on the site may describe a room
-- the house does not have, and the house's own description of itself, and
-- the privacy and terms copy, are the house's to supply.
--
-- Three published pages, seeded from drafts, said otherwise:
--   * about: opened with the retired phrase "a hospitality-led cultural
--     institution in Kathmandu";
--   * terms: described the site as "a reservation desk" and covered
--     "reserving a table";
--   * privacy: set out the data collected for "Reserve a table (the
--     Hearth)" and reservation confirmation emails.
--
-- They are archived, not deleted and not rewritten: archiving is the
-- house's own reversible act (the desk can restore any of them to
-- published), and nothing is written in their place. The addresses now
-- show "This page has not been written yet" until the house publishes
-- words of its own. The go-live runbook says the same.
do $$
declare
  v_item record;
begin
  perform set_config('paz.allow_transition', 'on', true);
  for v_item in
    select id, slug from publishing.items
    where type = 'page' and status = 'published' and slug in ('about', 'terms', 'privacy')
  loop
    update publishing.items set status = 'archived', archived_at = now() where id = v_item.id;
    insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, before, after)
    values (null, 'publishing.item.transition', 'publishing', 'items', v_item.id,
      jsonb_build_object('status', 'published'),
      jsonb_build_object('status', 'archived', 'reason', 'migration 0073: described the cafe or carried retired wording'));
  end loop;
  perform set_config('paz.allow_transition', '', true);
end;
$$;
