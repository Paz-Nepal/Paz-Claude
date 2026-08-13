-- 0054_service_role_publishing_schema_usage.sql
--
-- Found live testing the send-a-pigeon Edge Function after 0053: still
-- "permission denied", now for the publishing schema. api.send_a_pigeon
-- is security invoker (unlike submit_contact_message/
-- submit_membership_application, both security definer) -- its body
-- calls publishing.submit_pigeon() by qualified name, which requires the
-- caller (service_role, now that 0051 forces this Edge Function to be
-- the only caller) to have USAGE on the publishing schema itself, not
-- just EXECUTE on the function. 0053 only covered api/admin.

grant usage on schema publishing to service_role;
