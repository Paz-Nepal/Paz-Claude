// T-083. Staff tool (front desk / hospitality) for verifying a member's
// digital card. Forwards the caller's own Authorization header so
// authz.has_staff_permission('membership.member.read') -- via
// membership.members' members_select_staff RLS policy, which
// api.verify_member_card (security invoker, 0042) relies on -- is
// checked exactly as it would be for a direct client call. A caller
// without that permission gets back zero rows, not an error: this
// function distinguishes "not found" from "not authorized" the same way
// the underlying RLS-scoped read does.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface VerifyCardBody {
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

  let body: VerifyCardBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.token?.trim()) return jsonError("token is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase
    .schema("api")
    .rpc("verify_member_card", { p_token: body.token });

  if (error) {
    return jsonError(error.message, 400);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { member_no: string; member_name: string; tier_name: string; status: string; valid: boolean }
    | undefined;

  if (!row) {
    return new Response(JSON.stringify({ found: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      found: true,
      memberNo: row.member_no,
      memberName: row.member_name,
      tierName: row.tier_name,
      status: row.status,
      valid: row.valid,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
