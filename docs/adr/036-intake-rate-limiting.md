# ADR-36: IP-based rate limiting on public intake endpoints

**Status:** Implemented and verified live (migrations `0051`-`0058`;
Edge Functions `send-a-pigeon` (new), `submit-contact-message`,
`submit-membership-application`, `accept-membership-invitation`).

## Decision

`docs/remaining-work.md` §5 flagged "no rate limiting" on every public
intake endpoint (pigeon post, contact form, membership application) as a
small, documented, cross-cutting gap. Closing it turned out to require a
real architectural change, not just adding a counter:

- **A rate limit enforced only inside an Edge Function is not a rate
  limit** if the RPC it wraps is still directly callable via PostgREST
  with the anon key — an attacker just skips the Edge Function. Two of
  the three endpoints (`api.send_a_pigeon`, `api.submit_membership_application`)
  were exactly in this position: directly anon/authenticated-callable,
  with no Edge Function in front of the pigeon one at all.
- **PostgREST/RPC calls don't reliably see the real client IP** — only
  the Edge Function layer does (`x-forwarded-for`, set by Supabase's own
  edge network, not trusted from the client — confirmed live: a
  client-supplied `x-forwarded-for` value was silently ignored in favor
  of the real observed address). So the Edge Function isn't just a nice
  place to put the check, it's the _only_ place it can happen at all.

Closing this properly, therefore, meant making the Edge Function the
**only** path in:

- `admin.intake_rate_limits` (endpoint, ip_hash, occurred_at) +
  `admin.check_rate_limit()`, wrapped by a thin `api.check_rate_limit()`
  (admin is not a PostgREST-exposed schema — `schemas = ["public", "api"]`
  in `supabase/config.toml` — so the wrapper is the only way an Edge
  Function can reach it at all). Both `service_role` only.
- `api.send_a_pigeon`, `api.submit_contact_message`,
  `api.submit_membership_application` all had `anon`/`authenticated`
  execute revoked and `service_role` granted instead (`0051`). Each Edge
  Function switched from an anon client (forwarding the caller's own
  `Authorization` header) to a service-role client.
- IP is SHA-256 hashed before it's ever written — this repo's whole
  premise is no reader tracking, and a hash serves the rate-limit purpose
  exactly as well as the raw address. Rows self-expire after a day
  (deleted opportunistically inside `check_rate_limit`, not a separate
  cron job for what is, by volume, a tiny table).
- Limits: 5/hour for pigeon post and contact, 3/hour for membership
  applications (a more deliberate, lower-volume action), 10/hour for
  invitation acceptance (tighter than volume alone would suggest — this
  one is guarding token brute-forcing, not just spam) — reasonable
  defaults, easy to retune later since they're plain function arguments,
  not schema.
- `api.accept_membership_invitation` (D-12) got the same treatment
  (`0058`): it's the other genuinely public, unauthenticated endpoint in
  this group, and the raw token _is_ the credential, so a rate limit here
  is a real brute-force mitigation, not just an anti-spam floor.
  `verify_member_card` (ADR-27, digital card verification) was
  deliberately left out — it was already `authenticated`-only, not
  anon-callable, and further gated by staff-permission RLS internally, a
  meaningfully lower risk profile (as `docs/remaining-work.md` already
  noted before this ADR existed).

This is a floor underneath every public intake path, not a replacement
for Cloudflare Turnstile on the pigeon intake specifically (still
deferred pending a site key) — the two are complementary.

## Bugs found live-testing this

First real exercise of several migrations written earlier this session,
never executed until now:

- `service_role` was never granted `USAGE` on the `api`, `admin`, or
  `publishing` schemas anywhere in this project's history — only
  function-level `EXECUTE` grants existed. Schema-level `USAGE` is
  necessary but easy to forget alongside it; this had presumably been
  silently broken for `api.publish_scheduled_items` and
  `api.terms_due_for_renewal_notice` too, just never caught since neither
  had run against a live database before (`0053`, `0054`).
- `api.submit_membership_application` had the exact `create or replace
function` arity-overload mistake already found and fixed in
  `publishing.transition_item` (see `0048`/`0049`'s commit) — `0043`
  added a sixth parameter believing this replaces the original 5-arg
  function in place; it created a second overload instead. Both were
  live simultaneously, confirmed by PostgREST refusing to pick one
  ("Could not choose the best candidate function") the moment both
  matched a call. The stale 5-arg overload was never touched by this
  ADR's own revoke (which only named the 6-arg signature), so it
  remained a live bypass of the rate limit until caught and fixed
  (`0057`).
- The same migration also silently reintroduced a bug `0011` had already
  fixed once: `set search_path` omitting `public`, where the `citext`
  extension actually lives, breaking `p_email::citext` with "type citext
  does not exist" — because `0043` created a new function object instead
  of editing the existing (already-fixed) one, it needed the fix again
  and didn't get it (`0057`).

## Still open

- Cloudflare Turnstile on the pigeon intake specifically — needs a site
  key, unrelated to and not replaced by this.
- Limits are a single global figure per endpoint, not tiered by caller
  reputation or adjustable without a deploy.
- `verify_member_card` (digital card verification) has no rate limit —
  deliberately deferred, see above, given its already-narrower risk
  profile.
