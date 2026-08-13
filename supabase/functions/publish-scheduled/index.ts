// Scheduled publishing (T-061): "publish-scheduled" — not called by a
// person, invoked periodically by
// .github/workflows/publish-scheduled-items.yml, the same scheduled-job
// pattern send-renewal-notices.ts and the two backup workflows already
// established.
//
// Same auth shape as send-renewal-notices: no caller Authorization
// header to forward (there is no end-user request), so this builds its
// own service-role client and requires the caller's bearer token to
// match SUPABASE_SERVICE_ROLE_KEY exactly — verify_jwt=true alone only
// proves *a* valid JWT was presented, not which one.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface PublishedItem {
  item_id: string;
  slug: string;
  title: string;
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

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (bearerToken !== serviceRoleKey) {
    return jsonError("This function may only be called by the scheduled job", 403);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  const { data, error } = await supabase.schema("api").rpc("publish_scheduled_items");

  if (error) {
    return jsonError(error.message, 500);
  }

  const published = (data ?? []) as PublishedItem[];
  for (const item of published) {
    console.log(`publish-scheduled: published ${item.slug} (${item.item_id})`);
  }

  return new Response(JSON.stringify({ published: published.length, items: published }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
