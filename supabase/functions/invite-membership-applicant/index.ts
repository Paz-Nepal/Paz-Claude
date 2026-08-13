// Staff-only: invites a pending application (or re-issues an expired
// invitation) via api.invite_membership_application /
// api.reissue_membership_invitation, then emails the applicant their
// acceptance link (D-12). Forwards the caller's own Authorization header
// so authz.has_staff_permission('membership.application.decide') is
// checked exactly as it would be for a direct client call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface InviteApplicantBody {
  applicationId: string;
  reissue?: boolean;
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

  let body: InviteApplicantBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.applicationId) return jsonError("applicationId is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

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

  const rpcName = body.reissue ? "reissue_membership_invitation" : "invite_membership_application";
  const { data: invitationRows, error } = await supabase
    .schema("api")
    .rpc(rpcName, { p_application: body.applicationId });

  if (error) {
    return jsonError(error.message, 400);
  }

  const invitation = (Array.isArray(invitationRows) ? invitationRows[0] : invitationRows) as
    { invitation_id: string; token: string; expires_at: string } | undefined;

  if (!invitation) {
    return jsonError("Invitation was not created", 500);
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
    const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
    const acceptUrl = `${siteUrl}/membership/accept-invitation?token=${invitation.token}`;

    try {
      await sendEmail({
        to: application.applicant_email as string,
        template: {
          name: "membership-invitation",
          data: { fullName: application.applicant_name as string, tierName, acceptUrl },
        },
        entity: { schema: "membership", table: "invitations", id: invitation.invitation_id },
      });
    } catch (err) {
      console.error("invite-membership-applicant: invitation email failed", err);
    }
  }

  return new Response(
    JSON.stringify({ invitationId: invitation.invitation_id, expiresAt: invitation.expires_at }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
