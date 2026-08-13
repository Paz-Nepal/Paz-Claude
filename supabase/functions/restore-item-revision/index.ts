// T-060. Staff tool: "restore as new" -- copies a past revision's
// content onto the item's current row. api.restore_item_revision (0045)
// does the actual work (a plain UPDATE that the existing capture-
// revision trigger snapshots as a fresh revision); this just forwards
// the caller's own Authorization header so both the read (revision RLS)
// and the write (item RLS) are checked exactly as they would be for a
// direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface RestoreItemRevisionBody {
  revisionId: string;
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

  let body: RestoreItemRevisionBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.revisionId?.trim()) return jsonError("revisionId is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { error } = await supabase
    .schema("api")
    .rpc("restore_item_revision", { p_revision: body.revisionId });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
