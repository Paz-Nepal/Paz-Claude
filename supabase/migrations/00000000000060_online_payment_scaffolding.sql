-- T-040/payments scaffolding. Architecture Blueprint §4.4 explicitly
-- scoped v1.0 payments as "recorded, not processed" and named online
-- processing (eSewa/Khalti) as Phase 3, "deliberately deferred rather
-- than half-built." This migration and its sibling Edge Functions build
-- that deferred piece ahead of schedule, at the user's explicit request
-- (asked directly given the conflict with the blueprint's own stated
-- principle) -- see docs/adr/037-online-payment-scaffolding.md for the
-- full record of that decision and every caveat: no merchant sandbox
-- credentials exist yet, so none of this has ever run against a real
-- eSewa/Khalti endpoint.
--
-- membership.record_payment (0010) already covers manual recording by
-- staff (cash/bank transfer, typed in by Finance) and is untouched. This
-- adds the columns and a separate function an online-payment webhook
-- needs: which gateway, and that gateway's own transaction id, so a
-- payment can be reconciled against eSewa/Khalti's own dashboard later.

alter table membership.terms
  add column payment_method text
    check (payment_method in ('cash', 'bank_transfer', 'esewa', 'khalti')),
  add column payment_ref text;

comment on column membership.terms.payment_method is
  'How this term was paid. Null until paid_at is set. Cash/bank_transfer '
  'are recorded manually by staff via membership.record_payment; '
  'esewa/khalti are recorded by their respective Edge Function webhooks '
  'via membership.record_online_payment.';
comment on column membership.terms.payment_ref is
  'The paying gateway''s own transaction id (eSewa''s transaction_uuid, '
  'Khalti''s pidx), or a staff-entered reference for cash/bank transfer. '
  'Null until paid_at is set.';

-- membership.record_payment (0010) is staff-authenticated (checks
-- authz.has_staff_permission) -- wrong shape for a payment gateway
-- callback, which has no PAZ staff session, only proof the gateway
-- itself verified the transaction (checked inside the calling Edge
-- Function, not here). This is service-role-only, the same discipline
-- migrations 0051-0058 established for the intake Edge Functions: never
-- directly callable by anon/authenticated, only by a trusted Edge
-- Function holding the service-role key.
create function membership.record_online_payment(
  p_term uuid,
  p_amount_cents int,
  p_method text,
  p_ref text
)
returns membership.terms
language plpgsql
security definer
set search_path = membership, pg_temp
as $$
declare
  v_term membership.terms;
begin
  if p_method not in ('esewa', 'khalti') then
    raise exception 'record_online_payment is only for esewa/khalti, got %', p_method;
  end if;
  if p_amount_cents < 0 then
    raise exception 'Amount cannot be negative';
  end if;
  if p_ref is null or p_ref = '' then
    raise exception 'A gateway transaction reference is required';
  end if;

  update membership.terms
  set paid_at = now(), amount_cents = p_amount_cents,
      payment_method = p_method, payment_ref = p_ref
  where id = p_term and paid_at is null
  returning * into v_term;
  if not found then
    raise exception 'Term % does not exist or is already paid', p_term;
  end if;
  return v_term;
end;
$$;

revoke all on function membership.record_online_payment(uuid, int, text, text) from public, anon, authenticated;

-- api wrapper (membership isn't in supabase/config.toml's exposed
-- schemas -- only public/api are PostgREST-reachable, same reasoning as
-- api.check_rate_limit in 0056).
create function api.record_online_payment(
  p_term uuid,
  p_amount_cents int,
  p_method text,
  p_ref text
)
returns membership.terms
language sql
security invoker
set search_path = membership, pg_temp
as $$
  select membership.record_online_payment(p_term, p_amount_cents, p_method, p_ref);
$$;

revoke all on function api.record_online_payment(uuid, int, text, text) from public, anon, authenticated;
grant usage on schema membership to service_role;
grant execute on function membership.record_online_payment(uuid, int, text, text) to service_role;
grant execute on function api.record_online_payment(uuid, int, text, text) to service_role;
