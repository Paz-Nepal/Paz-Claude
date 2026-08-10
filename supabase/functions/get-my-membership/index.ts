// T-083. Self-service read of api.my_membership (0042) for the member
// card page. A direct RPC/view read is possible from the browser too,
// but my_membership is brand new this session and packages/types/src/
// database.generated.ts was never regenerated against a live database --
// routing through an Edge Function with a hand-written response shape
// avoids depending on stale generated types, same reasoning as every
// other new-this-session DB object (see ADR-26).
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

  const { data, error } = await supabase
    .schema("api")
    .from("my_membership")
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ membership: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
