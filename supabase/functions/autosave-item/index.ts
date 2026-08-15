// T-048. api.autosave_item (0062) is new this session and not in the
// (never-regenerated) generated types -- routed through an Edge Function
// rather than a direct typed RPC call, same reasoning as everything
// since ADR-26. Forwards the caller's own Authorization header so
// publishing.autosave_item's RLS-based authorization (items_update_own_draft
// / items_update_staff, 0008 -- the same policies api.save_item already
// relies on) is enforced exactly as it would be for a direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AutosaveItemBody {
  id: string;
  title: string;
  titleNe: string | null;
  body: unknown;
  bodyNe: unknown;
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

  let body: AutosaveItemBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.id?.trim()) {
    return jsonError("id is required", 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { error } = await supabase.schema("api").rpc("autosave_item", {
    p_id: body.id,
    p_title: body.title,
    p_title_ne: body.titleNe,
    p_body: body.body,
    p_body_ne: body.bodyNe,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
