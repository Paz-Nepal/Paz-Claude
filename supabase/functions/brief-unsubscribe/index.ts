// One-action unsubscribe from the Brief. The page at /brief/unsubscribe
// calls this the moment it opens, so leaving is a single step and never a
// form. api.brief_unsubscribe is granted to service_role only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (!body.token) return jsonError("The link is incomplete", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { allowed } = await checkRateLimit(supabase, req, "brief-unsubscribe", {
    maxCount: 20,
    windowMinutes: 60,
  });
  if (!allowed) return jsonError("Too many requests. Try again later.", 429);

  const { data, error } = await supabase
    .schema("api")
    .rpc("brief_unsubscribe", { p_token: body.token });
  if (error) return jsonError("The link is not valid", 400);
  if (!data) return jsonError("The link is not valid", 404);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
