-- 0079_brief_send_guard.sql
--
-- An issue of the Brief can only ever go out once. The guard row is written
-- BEFORE any mail is sent (a unique violation refuses a second send), and
-- the recipient count is filled in afterwards.
create function api.brief_begin_send(p_item uuid)
returns void
language plpgsql
volatile
security definer
set search_path = mail, pg_temp
as $$
begin
  insert into mail.brief_sends (item_id, recipient_count) values (p_item, 0);
exception when unique_violation then
  raise exception 'This Brief has already been sent.' using errcode = '23505';
end;
$$;

create or replace function api.brief_record_send(p_item uuid, p_count int)
returns void
language sql
volatile
security definer
set search_path = mail, pg_temp
as $$
  update mail.brief_sends set recipient_count = p_count where item_id = p_item;
$$;

revoke all on function api.brief_begin_send from public, anon, authenticated;
grant execute on function api.brief_begin_send(uuid) to service_role;
