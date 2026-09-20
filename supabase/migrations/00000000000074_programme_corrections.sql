-- 0074_programme_corrections.sql
--
-- Build Programme 2.2, 2.3, 2.4:
--   * the nine published placeholder pages ("Placeholder text, replace from
--     the editorial desk...") are archived: they were instructions to the
--     desk served to readers. Archiving is reversible from the desk and
--     nothing is written in their place; the addresses render the house's
--     own empty states instead;
--   * /visit is removed (it promised hours) and redirects to the Wall;
--   * the Record organ takes /record and the deposit index moves to
--     /record/deposits, so the old organ address redirects to it;
--   * the style rules reach the database: no publishable field may contain
--     an em dash, because the prerender bakes desk content into shipped
--     files.

insert into publishing.redirects (old_path, new_path) values
  ('/visit', '/wall'),
  ('/the-record', '/record')
on conflict (old_path) do nothing;

do $$
declare
  v_item record;
begin
  perform set_config('paz.allow_transition', 'on', true);
  for v_item in
    select id, slug from publishing.items
    where type = 'page' and status = 'published'
      and slug in ('guild', 'hearth', 'house', 'press', 'the-record', 'treasury',
                   'encounters', 'contact', 'visit')
  loop
    update publishing.items set status = 'archived', archived_at = now() where id = v_item.id;
    insert into admin.audit_log (actor, action, entity_schema, entity_table, entity_id, before, after)
    values (null, 'publishing.item.transition', 'publishing', 'items', v_item.id,
      jsonb_build_object('status', 'published'),
      jsonb_build_object('status', 'archived',
        'reason', 'migration 0074: placeholder instruction to the desk was being served to readers'));
  end loop;
  perform set_config('paz.allow_transition', '', true);
end;
$$;

-- ---------------------------------------------------------------------
-- No em dash in any publishable field.
-- ---------------------------------------------------------------------
create function publishing.reject_em_dash()
returns trigger
language plpgsql
as $$
begin
  if position(chr(8212) in to_jsonb(new)::text) > 0 then
    raise exception 'An em dash cannot be published. Rewrite the sentence without one.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger items_reject_em_dash
  before insert or update on publishing.items
  for each row when (new.status = 'published')
  execute function publishing.reject_em_dash();

create trigger chronicle_reject_em_dash
  before insert on publishing.chronicle_lines
  for each row execute function publishing.reject_em_dash();
create trigger glossary_reject_em_dash
  before insert or update on publishing.glossary_terms
  for each row execute function publishing.reject_em_dash();

create trigger people_reject_em_dash
  before insert or update on wall.people
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger works_reject_em_dash
  before insert or update on wall.works
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger shows_reject_em_dash
  before insert or update on wall.shows
  for each row when (new.published) execute function publishing.reject_em_dash();
create trigger work_texts_reject_em_dash
  before insert on wall.work_texts
  for each row execute function publishing.reject_em_dash();
create trigger exhibitions_reject_em_dash
  before insert on wall.person_exhibitions
  for each row execute function publishing.reject_em_dash();
create trigger writings_reject_em_dash
  before insert on wall.person_writings
  for each row execute function publishing.reject_em_dash();

create trigger pieces_reject_em_dash
  before insert or update on sattal.pieces
  for each row when (new.status = 'published') execute function publishing.reject_em_dash();
create trigger corrections_reject_em_dash
  before insert on sattal.piece_corrections
  for each row execute function publishing.reject_em_dash();
