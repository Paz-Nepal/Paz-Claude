-- membership/02_renewal_notice_grants.sql
--
-- api.terms_due_for_renewal_notice / api.mark_renewal_notice_sent (0038)
-- read/write every active member's term and email address -- service_role
-- only, no person or staff role gets execute here, matching the pattern
-- established by admin/02_log_system_event.sql for the same class of
-- "no end-user request to authorize against" function.
begin;
select plan(4);

select ok(
  not has_function_privilege('authenticated', 'api.terms_due_for_renewal_notice()', 'EXECUTE'),
  'authenticated cannot execute api.terms_due_for_renewal_notice'
);
select ok(
  not has_function_privilege('anon', 'api.terms_due_for_renewal_notice()', 'EXECUTE'),
  'anon cannot execute api.terms_due_for_renewal_notice'
);
select ok(
  has_function_privilege('service_role', 'api.terms_due_for_renewal_notice()', 'EXECUTE'),
  'service_role can execute api.terms_due_for_renewal_notice'
);
select ok(
  not has_function_privilege('authenticated', 'api.mark_renewal_notice_sent(uuid, text)', 'EXECUTE'),
  'authenticated cannot execute api.mark_renewal_notice_sent'
);

select * from finish();
rollback;
