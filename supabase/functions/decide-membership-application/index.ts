// Staff-only: records a decision on a membership application via
// api.decide_membership_application, then tells the applicant
// (Architecture Blueprint §8, two-lane design). Forwards the caller's own
// Authorization header so authz.has_staff_permission('membership.application.decide')
// is checked exactly as it would be for a direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface DecideApplicationBody {
  applicationId: string;
  decision: "accepted" | "declined";
  notes: string | null;
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

  let body: DecideApplicationBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.applicationId) return jsonError("applicationId is required", 400);
  if (body.decision !== "accepted" && body.decision !== "declined") {
    return jsonError("decision must be 'accepted' or 'declined'", 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  // Read the application (name, email, tier) before deciding — same RLS
  // (staff-only) that would gate a direct read, so a caller who can't
  // decide also can't use this to fish for applicant details.
  const { data: application, error: readError } = await supabase
    .schema("api")
    .from("membership_applications")
    .select("applicant_name, applicant_email, tier_key")
    .eq("id", body.applicationId)
    .maybeSingle();

  if (readError) {
    return jsonError(readError.message, 400);
  }
  if (!application) {
    return jsonError("Application not found", 404);
  }

  const { data: status, error } = await supabase
    .schema("api")
    .rpc("decide_membership_application", {
      p_application: body.applicationId,
      p_decision: body.decision,
      p_notes: body.notes,
    });

  if (error) {
    return jsonError(error.message, 400);
  }

  let tierName = application.tier_key as string;
  const { data: tier } = await supabase
    .schema("api")
    .from("membership_tiers")
    .select("name")
    .eq("key", application.tier_key as string)
    .maybeSingle();
  if (tier?.name) tierName = tier.name;

  if (application.applicant_email) {
    try {
      await sendEmail({
        to: application.applicant_email as string,
        template: {
          name: "membership-application-decided",
          data: {
            fullName: application.applicant_name as string,
            tierName,
            decision: body.decision,
            notes: body.notes,
          },
        },
        entity: { schema: "membership", table: "applications", id: body.applicationId },
      });
    } catch (err) {
      console.error("decide-membership-application: decision email failed", err);
    }
  }

  return new Response(JSON.stringify({ status }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
