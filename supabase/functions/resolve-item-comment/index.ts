// T-059. api.resolve_item_comment (0063) -- see list-item-comments/index.ts
// for why this is an Edge Function. Forwards the caller's own
// Authorization header; publishing.resolve_item_comment itself checks
// that the caller is either the comment's author or holds
// publishing.item.update (security definer, since resolving isn't a
// direct table grant -- see 0063).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ResolveItemCommentBody {
  commentId: string;
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

  let body: ResolveItemCommentBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.commentId?.trim()) return jsonError("commentId is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data, error } = await supabase
    .schema("api")
    .rpc("resolve_item_comment", { p_comment: body.commentId });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ comment: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
