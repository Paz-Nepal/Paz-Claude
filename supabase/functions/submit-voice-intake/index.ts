// Private intake for people who may be recorded in future (Build
// Specification 10, /a-voice). Wraps api.submit_voice_intake, which is
// granted to service_role only, so this function and its rate limit are
// the only way in. Nothing is published, listed or searchable; the rows
// are readable only by authenticated staff holding crm.voice.read. The only
// email is a one-line "something is waiting" with nothing of the voice in it:
// the intake is never a directory.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { notifyWaiting } from "../_shared/notify-waiting.ts";

interface VoiceIntakeBody {
  writerName: string;
  contact: string;
  aboutName?: string;
  place?: string;
  note?: string;
  kind?: string;
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

  let body: VoiceIntakeBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.writerName?.trim()) return jsonError("A name is required", 400);
  if (!body.contact?.trim()) return jsonError("A way to reach you is required", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { allowed } = await checkRateLimit(supabase, req, "submit-voice-intake", {
    maxCount: 5,
    windowMinutes: 60,
  });
  if (!allowed) {
    return jsonError("Too many submissions. Try again later.", 429);
  }

  const { error } = await supabase.schema("api").rpc("submit_voice_intake", {
    p_writer_name: body.writerName,
    p_contact: body.contact,
    p_about_name: body.aboutName ?? null,
    p_place: body.place ?? null,
    p_note: body.note ?? null,
    p_kind: body.kind ?? "voice",
  });
  if (error) {
    return jsonError(error.message, 400);
  }

  await notifyWaiting(supabase, "desk");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
