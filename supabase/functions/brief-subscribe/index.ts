// Subscribing to the Brief (Build Programme 13). One list, double opt-in:
// this only records a pending request and sends the confirmation message.
// Nothing further is sent to an address until its owner follows the link.
// api.brief_subscribe is granted to service_role only, so this function and
// its rate limit are the only way in.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const email = body.email?.trim();
  if (!email) return jsonError("An email address is required", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { allowed } = await checkRateLimit(supabase, req, "brief-subscribe", {
    maxCount: 5,
    windowMinutes: 60,
  });
  if (!allowed) return jsonError("Too many requests. Try again later.", 429);

  const { data, error } = await supabase.schema("api").rpc("brief_subscribe", { p_email: email });
  if (error) return jsonError(error.message, 400);

  const row = (data as Array<{ confirm_token: string; already_confirmed: boolean }> | null)?.[0];
  // An address that is already confirmed gets no second message and no hint
  // either way, so the form cannot be used to probe who subscribes.
  if (row && !row.already_confirmed) {
    const site = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
    try {
      await sendEmail({
        to: email,
        template: {
          name: "brief-confirmation",
          data: { confirmUrl: `${site}/brief/confirm?token=${row.confirm_token}` },
        },
      });
    } catch (err) {
      console.error("brief-subscribe: confirmation email failed", err);
      return jsonError("The confirmation message could not be sent.", 502);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
