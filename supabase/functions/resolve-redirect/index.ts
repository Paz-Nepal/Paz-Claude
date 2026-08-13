// T-049. Public: called by every "not found" page before it actually
// gives up, to check whether the requested slug used to point at
// content that's since been renamed. api.resolve_redirect (0043) is
// brand new this session -- packages/types/src/database.generated.ts
// was never regenerated against a live database, so this is routed
// through an Edge Function with a hand-written response shape rather
// than a direct typed RPC call (same reasoning as every other new
// object this session, see ADR-26).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ResolveRedirectBody {
  itemType: string;
  oldSlug: string;
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

  let body: ResolveRedirectBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.itemType?.trim() || !body.oldSlug?.trim()) {
    return jsonError("itemType and oldSlug are required", 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase
    .schema("api")
    .rpc("resolve_redirect", { p_type: body.itemType, p_old_slug: body.oldSlug });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ newSlug: (data as string | null) ?? null }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
