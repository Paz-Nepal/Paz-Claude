// T-060. Staff tool: the revision list for one item's editor page.
// api.item_revisions (0045) is new this session, not in the (never-
// regenerated) generated types -- hand-typed response, same pattern as
// everything since ADR-26. Forwards the caller's own Authorization
// header so item_revisions_select_own/_staff (0008) is checked exactly
// as it would be for a direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ListItemRevisionsBody {
  itemId: string;
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

  let body: ListItemRevisionsBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.itemId?.trim()) return jsonError("itemId is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase
    .schema("api")
    .rpc("item_revisions", { p_item: body.itemId });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ revisions: data ?? [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
