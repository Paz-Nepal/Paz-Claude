// Public/self-service session registration. Wraps api.register_for_session
// with the "you're registered" / "you're on the waitlist" email
// (Architecture Blueprint §8, two-lane design). Handles both anonymous
// registrants (email in the request body, same as reservations) and
// signed-in members (email resolved from their own profile), matching the
// RPC's own dual-path design.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface RegisterBody {
  sessionId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
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

  let body: RegisterBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.sessionId) return jsonError("sessionId is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: session, error: sessionError } = await supabase
    .schema("api")
    .from("program_sessions")
    .select("program_title, starts_at")
    .eq("id", body.sessionId)
    .maybeSingle();

  if (sessionError) {
    return jsonError(sessionError.message, 400);
  }
  if (!session) {
    return jsonError("Session not found", 404);
  }

  const { data: status, error } = await supabase.schema("api").rpc("register_for_session", {
    p_session: body.sessionId,
    p_full_name: body.fullName,
    p_email: body.email,
    p_phone: body.phone,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  // Anonymous registrants supply their own email; a signed-in registrant
  // may not have (the form doesn't ask when you're already known), so
  // fall back to their own profile — the only person that profile lookup
  // can ever resolve to is the caller themselves (api.my_profile filters
  // on auth.uid()).
  let recipientEmail = body.email;
  let recipientName = body.fullName;
  if (!recipientEmail) {
    const { data: profile } = await supabase
      .schema("api")
      .from("my_profile")
      .select("email, full_name")
      .maybeSingle();
    recipientEmail = profile?.email ?? null;
    recipientName = recipientName ?? profile?.full_name ?? null;
  }

  if (recipientEmail && recipientName) {
    try {
      await sendEmail({
        to: recipientEmail,
        template: {
          name: "session-registration",
          data: {
            fullName: recipientName,
            programTitle: session.program_title as string,
            startsAt: session.starts_at as string,
            status: status as "registered" | "waitlisted",
          },
        },
        entity: { schema: "programs", table: "registrations", id: null },
        context: { session_id: body.sessionId },
      });
    } catch (err) {
      console.error("register-for-session: confirmation email failed", err);
    }
  }

  return new Response(JSON.stringify({ status }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
