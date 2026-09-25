// The Record's listening log keeps names for a fixed period, then counts
// only (docs/website-additions.md C4). Invoked by
// .github/workflows/strip-listening-names.yml, never by a person. The period
// is the setting record.listening_names_days; until the house sets it, this
// strips nothing.
//
// Same auth shape as publish-scheduled: the caller's bearer token must equal
// SUPABASE_SERVICE_ROLE_KEY exactly.
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

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bearerToken = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (bearerToken !== serviceRoleKey) {
    return jsonError("This function may only be called by the scheduled job", 403);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
  const { data, error } = await supabase.schema("api").rpc("strip_listening_names");
  if (error) {
    return jsonError(error.message, 500);
  }

  return new Response(JSON.stringify({ stripped: data ?? 0 }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
