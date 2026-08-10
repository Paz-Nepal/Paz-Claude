// Membership renewal notices (D-11): "T-30 days: renewal notice
// email... one reminder at T-7, none after." Not called by a person —
// invoked daily by .github/workflows/membership-renewal-notices.yml,
// the same scheduled-job pattern nightly-backup-export.yml already
// established, holding the project's service_role key as its own bearer
// token.
//
// Unlike every other function in this repo, this one does NOT forward a
// caller's Authorization header — there is no end-user request to
// forward. It builds its own service-role client and, because
// verify_jwt=true only proves the caller presented *a* valid signed
// JWT (any anon/authenticated token would also pass that check), it
// additionally requires the caller's bearer token to match
// SUPABASE_SERVICE_ROLE_KEY exactly before doing anything — this
// function reads every active member's term and email address, which no
// ordinary caller should ever be able to trigger.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface DueTerm {
  term_id: string;
  member_id: string;
  full_name: string;
  email: string;
  tier_name: string;
  ends_on: string;
  notice_kind: "30d" | "7d";
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (bearerToken !== serviceRoleKey) {
    return jsonError("This function may only be called by the scheduled job", 403);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  const { data: dueTerms, error } = await supabase
    .schema("api")
    .rpc("terms_due_for_renewal_notice");

  if (error) {
    return jsonError(error.message, 500);
  }

  const results = { sent: 0, failed: 0 };

  for (const term of (dueTerms ?? []) as DueTerm[]) {
    try {
      await sendEmail({
        to: term.email,
        template: {
          name: "membership-renewal-notice",
          data: {
            fullName: term.full_name,
            tierName: term.tier_name,
            endsOn: term.ends_on,
            noticeKind: term.notice_kind,
          },
        },
        entity: { schema: "membership", table: "terms", id: term.term_id },
        context: { notice_kind: term.notice_kind },
      });
      await supabase.schema("api").rpc("mark_renewal_notice_sent", {
        p_term: term.term_id,
        p_notice_kind: term.notice_kind,
      });
      results.sent++;
    } catch (err) {
      // Deliberately does NOT mark the notice sent on failure -- a term
      // whose email failed stays eligible and is retried on the next
      // run, same reasoning as every other notification in this repo
      // never silently swallowing a failure that matters.
      console.error(`send-renewal-notices: failed for term ${term.term_id}`, err);
      results.failed++;
    }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
