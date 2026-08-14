// Public: accepts a membership invitation by its raw token (D-12). No
// Authorization header to forward — the token itself is the entire
// credential, same as a password-reset link. Wraps
// api.accept_membership_invitation, which is SECURITY DEFINER (see its
// own comment in migration 0040).
//
// Uses the service-role key: the RPC is granted to service_role only
// (migration 0058), so this Edge Function -- and the rate-limit check
// inside it -- is the only path in. That matters more here than for the
// other intake endpoints: the raw token *is* the credential, so this is
// a brute-force mitigation, not just an anti-spam floor.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

interface AcceptInvitationBody {
  token: string;
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

  let body: AcceptInvitationBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.token?.trim()) return jsonError("token is required", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // A tighter window than the other intake endpoints on purpose: this is
  // guarding token brute-forcing, not just spam volume.
  const { allowed } = await checkRateLimit(supabase, req, "accept-membership-invitation", {
    maxCount: 10,
    windowMinutes: 60,
  });
  if (!allowed) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  const { data: memberNo, error } = await supabase
    .schema("api")
    .rpc("accept_membership_invitation", { p_token: body.token });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ memberNo }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
