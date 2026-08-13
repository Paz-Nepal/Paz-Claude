// Public intake for membership applications. Wraps
// api.submit_membership_application with the "we've received your
// application" email (Architecture Blueprint §8, two-lane design).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface SubmitApplicationBody {
  fullName: string;
  email: string;
  phone: string | null;
  tierKey: string;
  motivation: string | null;
  communicationPreferences: { dispatch: boolean; programs: boolean } | null;
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

  let body: SubmitApplicationBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.fullName?.trim()) return jsonError("Full name is required", 400);
  if (!body.email?.trim()) return jsonError("Email is required", 400);
  if (!body.tierKey?.trim()) return jsonError("Membership tier is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: applicationId, error } = await supabase
    .schema("api")
    .rpc("submit_membership_application", {
      p_full_name: body.fullName,
      p_email: body.email,
      p_phone: body.phone,
      p_tier_key: body.tierKey,
      p_motivation: body.motivation,
      p_communication_preferences: body.communicationPreferences,
    });

  if (error) {
    return jsonError(error.message, 400);
  }

  // Best-effort human-readable tier name for the email; falls back to the
  // key itself if the lookup fails for any reason (e.g. a tier deactivated
  // between page load and submission).
  let tierName = body.tierKey;
  const { data: tier } = await supabase
    .schema("api")
    .from("membership_tiers")
    .select("name")
    .eq("key", body.tierKey)
    .maybeSingle();
  if (tier?.name) tierName = tier.name;

  try {
    await sendEmail({
      to: body.email,
      template: {
        name: "membership-application-received",
        data: { fullName: body.fullName, tierName },
      },
      entity: { schema: "membership", table: "applications", id: applicationId as string },
    });
  } catch (err) {
    console.error("submit-membership-application: confirmation email failed", err);
  }

  return new Response(JSON.stringify({ applicationId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
