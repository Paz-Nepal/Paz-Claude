// T-083. Self-service: a signed-in active/honorary member requests (or
// rotates) their digital card's verification code. Forwards the caller's
// own Authorization header so api.issue_my_card() runs as that person --
// there is no service-role path here, a member can only ever issue their
// own card (Build Readiness Review D-4, api.issue_my_card, 0042).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase.schema("api").rpc("issue_my_card");

  if (error) {
    return jsonError(error.message, 400);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    { member_no: string; token: string; issued_at: string } | undefined;

  if (!row) {
    return jsonError("Card was not issued", 500);
  }

  return new Response(
    JSON.stringify({ memberNo: row.member_no, token: row.token, issuedAt: row.issued_at }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
