-- 0021_crm_person_lookup.sql
--
-- The relationship admin UI needs to link a relationship to an existing
-- identity.people row by email (staff already know the person's email from
-- membership/CRM context) without granting broad identity.person.read.
-- Same narrow-accessor shape as identity.display_name/email_for.

create function api.find_person_by_email(p_email text)
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = identity, authz, public, pg_temp
as $$
  select p.id, coalesce(p.display_name, p.full_name)
  from identity.people p
  where p.email = p_email::citext
    and p.merged_into is null
    and (select authz.has_staff_permission('crm.relationship.manage'))
  limit 1;
$$;

revoke all on function api.find_person_by_email from public, anon;
grant execute on function api.find_person_by_email to authenticated;
