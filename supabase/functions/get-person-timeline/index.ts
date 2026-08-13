// T-095/D-14. Staff tool: a person's full institutional history.
// api.person_timeline (0044) is brand new this session and not in the
// (never-regenerated) generated types, so it's routed through an Edge
// Function with a hand-written response shape, same as every other
// object added since ADR-26. Forwards the caller's own Authorization
// header so each event category's own staff-only RLS policy is checked
// exactly as it would be for a direct client call -- see the migration's
// own comment for why no permission check is duplicated here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface GetPersonTimelineBody {
  personId: string;
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

  let body: GetPersonTimelineBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.personId?.trim()) return jsonError("personId is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase
    .schema("api")
    .rpc("person_timeline", { p_person: body.personId });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ events: data ?? [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
