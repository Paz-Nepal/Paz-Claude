// T-059. api.add_item_comment (0063) -- see list-item-comments/index.ts
// for why this is an Edge Function. Forwards the caller's own
// Authorization header so item_comments_insert (0063) -- reviewer/editor
// permission, or the item's own author replying -- is checked exactly as
// it would be for a direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AddItemCommentBody {
  itemId: string;
  blockIndex: number;
  anchorText: string;
  body: string;
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

  let payload: AddItemCommentBody;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!payload.itemId?.trim() || !payload.anchorText?.trim() || !payload.body?.trim()) {
    return jsonError("itemId, anchorText, and body are required", 400);
  }
  if (typeof payload.blockIndex !== "number" || payload.blockIndex < 0) {
    return jsonError("blockIndex must be a non-negative number", 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase.schema("api").rpc("add_item_comment", {
    p_item: payload.itemId,
    p_block_index: payload.blockIndex,
    p_anchor_text: payload.anchorText,
    p_body: payload.body,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ comment: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
