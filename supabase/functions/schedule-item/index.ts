// T-061. Staff tool: transition an item into 'scheduled'. Both the
// 'scheduled' status literal (0046) and api.transition_item's
// p_scheduled_for parameter (0047) are new this session and not in the
// (never-regenerated) generated types, so this is routed through an
// Edge Function rather than a direct typed RPC call, same reasoning as
// everything since ADR-26. Forwards the caller's own Authorization
// header so publishing.transition_item's own permission check (item.publish)
// and its "must be a signed-in human actor" requirement are enforced
// exactly as they would be for a direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ScheduleItemBody {
  itemId: string;
  scheduledFor: string;
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

  let body: ScheduleItemBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.itemId?.trim() || !body.scheduledFor?.trim()) {
    return jsonError("itemId and scheduledFor are required", 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { error } = await supabase.schema("api").rpc("transition_item", {
    p_id: body.itemId,
    p_to: "scheduled",
    p_scheduled_for: body.scheduledFor,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
