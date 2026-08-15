# ADR-37: Online Payment Scaffolding (eSewa/Khalti) — T-040

**Status:** Implemented, unrun. Built ahead of schedule at the user's
explicit request; see "Why this exists despite the blueprint" below.

## Context

The Architecture Blueprint (§4.4) makes an explicit, deliberate scoping
decision for v1.0:

> Payments in v1.0 are recorded, not processed. Nepal's payment landscape
> (eSewa, Khalti, bank transfer, cash at the desk) is handled
> operationally; Finance records payments against terms. Online payment
> processing is Phase 3 (§15) — deliberately deferred rather than
> half-built.

That decision was made for a real reason: online payment integration
touches money, has no way to be genuinely tested without a merchant
account and sandbox credentials neither of which exist yet, and
"half-built" payment code is a worse failure mode than no payment code —
it looks done, isn't verifiable, and is exactly the kind of thing that
should not ship without a real security review.

## Decision

Asked the user directly whether to respect that deferral or build the
scaffolding anyway, given the direct conflict with the blueprint's own
stated principle. The user chose to build it now. This ADR exists so that
choice — and every caveat that comes with building payment code nobody
can currently run — is on the record, not silently folded into a normal
feature migration.

**This has never executed against a real eSewa or Khalti endpoint.**
There is no merchant account for either gateway, so `ESEWA_SECRET_KEY`,
`KHALTI_SECRET_KEY`, and the rest are unset placeholders
(`supabase/functions/.env.example`). Every Edge Function below returns
`501` if its required environment variables aren't set, rather than
attempting a request with empty credentials.

### Schema (0060, 0061)

- `membership.terms` gains `payment_method` (`cash | bank_transfer |
esewa | khalti`) and `payment_ref` (the gateway's own transaction id, or
  a staff-entered reference for the manual methods) — both nullable,
  set together with `paid_at`.
- `membership.record_payment` (0010, staff-authenticated, for
  cash/bank transfer) is untouched. A new `membership.record_online_payment`
  is **service-role only** — a payment gateway callback has no PAZ staff
  session, only proof the gateway itself confirmed the transaction
  (checked inside the calling Edge Function, not the database function).
  Same discipline migrations 0051–0058 established for the intake Edge
  Functions: never directly callable by `anon`/`authenticated`, and it
  refuses to double-record (`where paid_at is null`).
- `api.my_term(p_term)` (0061): a small gap the initiate functions needed
  and didn't have — reading a single term by id, on the caller's own
  behalf. `security invoker`, so `membership.terms`' own
  `terms_select_self` RLS policy is what actually authorizes it, same as
  every other self-service read in this codebase.

### Edge Functions

- `initiate-esewa-payment` — authenticated (forwards the caller's own
  JWT), reads the term via `api.my_term`, builds an HMAC-SHA256-signed
  eSewa ePay v2 form payload. Returns `{ formUrl, fields }` for the
  frontend to submit as a real browser form POST (this is eSewa's actual
  integration shape — a signed form submission, not an API call the
  server makes on the user's behalf).
- `esewa-payment-callback` — public (eSewa redirects the browser here).
  Verifies the HMAC signature on the redirect payload, **then** confirms
  against eSewa's own transaction-status endpoint before recording
  anything (a redirect URL is client-visible and could be replayed or
  forged — the signature check alone isn't enough to skip the
  server-to-server confirmation). Only then calls
  `record_online_payment` with the service-role key.
- `initiate-khalti-payment` — authenticated, same `api.my_term` read,
  calls Khalti's `epayment/initiate/` API server-to-server, returns the
  `payment_url` to redirect the browser to.
- `khalti-payment-callback` — public (Khalti redirects here with a
  `pidx`), looks `pidx` up against Khalti's own `epayment/lookup/` API
  before recording anything, same "never trust the redirect alone"
  reasoning as the eSewa side.

### What is deliberately not built

- No frontend UI. "Payments scaffolding" per the task this closes is the
  backend half; wiring the member-facing renewal flow to actually call
  these functions is separate, larger, user-facing work that should wait
  for real credentials to test against.
- No refund/webhook-retry handling, no reconciliation job against either
  gateway's dashboard, no partial-payment support. All Phase-3-scope
  concerns that don't matter until there's a live integration to harden.

## Consequences

- Before this can process a single real transaction: a real eSewa
  merchant account and a real Khalti merchant account, both gateways'
  sandbox credentials tested end-to-end (this code has _never_ run — it
  compiles and type-checks, that is the entire extent of its
  verification), and a real security review given this touches money.
- `record_online_payment`'s `where paid_at is null` guard is the only
  replay protection at the database layer; the Edge Functions' signature
  and status-check verification is the only protection against a forged
  callback. Both should be re-examined by someone other than the author
  before this goes live, not taken on faith from this ADR.
- If Phase 3 is reached "for real," treat this as a draft to review and
  harden, not a finished integration to flip a flag on.
