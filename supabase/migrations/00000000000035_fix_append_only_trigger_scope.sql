-- 0035_fix_append_only_trigger_scope.sql
--
-- Real bug found while about to point the user at the CMS to edit
-- institutional pages: publishing.block_deposited_content_edit() (0025)
-- blocks content edits on ANY item with status = 'published', not just
-- items that have actually been deposited onto the Record. Institutional
-- pages (/about, the organs, /encounters, /visit, /contact) are type
-- 'page', published via the plain publishing.transition_item() path
-- (0026's guard on deposit_item() already excludes 'page' from the
-- deposit series) -- they were never "deposited" and were never meant to
-- be append-only. As written, editing one after publishing it would raise
-- "Deposited items are append-only", which is simply wrong for a type
-- the spec never asked to be immutable.
--
-- The fix: key the trigger off deposit_ref being set, not status alone.
-- deposit_ref is set in exactly one place (publishing.deposit_item()), so
-- "has a deposit_ref" is precisely "this item was actually deposited" --
-- unlike status = 'published', which every publishable type reaches.

create or replace function publishing.block_deposited_content_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'published'
     and old.deposit_ref is not null
     and coalesce(current_setting('paz.allow_transition', true), '') <> 'on'
     and (
       new.title is distinct from old.title
       or new.title_ne is distinct from old.title_ne
       or new.subtitle is distinct from old.subtitle
       or new.subtitle_ne is distinct from old.subtitle_ne
       or new.summary is distinct from old.summary
       or new.summary_ne is distinct from old.summary_ne
       or new.body is distinct from old.body
       or new.body_ne is distinct from old.body_ne
       or new.slug is distinct from old.slug
     )
  then
    raise exception
      'Deposited items are append-only: content cannot be edited once published. Create a new version instead (previous_version_of).'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
comment on function publishing.block_deposited_content_edit() is
  'Non-negotiable §3: DEPOSITED content is never silently edited --
  scoped to deposit_ref is not null, not status = ''published'' alone, so
  institutional pages (type=page, published but never deposited) stay
  normally editable. Status transitions (paz.allow_transition flag, see
  block_direct_status_change in migration 0008) and non-content fields
  (tags, featured_media) remain editable throughout regardless.';
