// Raising a safeguarding concern (Build Programme 12). Stores the concern
// where only the one named holder of safeguarding.read can read it, so a
// concern never passes through the person it might be about. No email goes
// to the wider staff: the only message is a one-line "something is waiting" to
// the one address named for concerns, and it carries none of what was written.
// api.submit_concern is granted to service_role only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { notifyWaiting } from "../_shared/notify-waiting.ts";

interface ConcernBody {
  writerName?: string;
  contact?: string;
  body?: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: ConcernBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (!body.body?.trim()) return jsonError("A concern needs some words", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { allowed } = await checkRateLimit(supabase, req, "submit-concern", {
    maxCount: 5,
    windowMinutes: 60,
  });
  if (!allowed) return jsonError("Too many submissions. Try again later.", 429);

  const { error } = await supabase.schema("api").rpc("submit_concern", {
    p_writer_name: body.writerName ?? null,
    p_contact: body.contact ?? null,
    p_body: body.body,
  });
  if (error) return jsonError(error.message, 400);

  // Tells the one named holder that a concern is waiting, with nothing of it.
  await notifyWaiting(supabase, "concern");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
