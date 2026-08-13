// Public pigeon-post intake. Wraps api.send_a_pigeon, which is granted to
// service_role only (migration 0051) -- this Edge Function, and the
// rate-limit check inside it, is the only path in. No confirmation email:
// pigeon-post contributors are anonymous by design (spec §2/§5), there is
// no address to send one to.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

interface SendAPigeonBody {
  contributorName: string | null;
  contributorContact: string | null;
  content: string;
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

  let body: SendAPigeonBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.content?.trim()) return jsonError("Nothing to send", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { allowed } = await checkRateLimit(supabase, req, "send-a-pigeon", {
    maxCount: 5,
    windowMinutes: 60,
  });
  if (!allowed) {
    return jsonError("Too many submissions. Try again later.", 429);
  }

  const { error } = await supabase.schema("api").rpc("send_a_pigeon", {
    p_contributor_name: body.contributorName,
    p_contributor_contact: body.contributorContact,
    p_content: body.content,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
