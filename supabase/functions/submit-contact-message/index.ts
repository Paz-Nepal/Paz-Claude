// Public contact form intake (T-068). Wraps api.submit_contact_message
// and notifies staff (not the submitter — see the comment on that
// function, migration 0037) at the address in api.site_info()'s
// site.contact_email — the same whitelisted, already-public setting the
// frontend footer reads (migration 0008), so no service-role access to
// admin.settings is needed here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface SubmitContactMessageBody {
  fullName: string;
  email: string;
  message: string;
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

  let body: SubmitContactMessageBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.fullName?.trim()) return jsonError("Full name is required", 400);
  if (!body.email?.trim()) return jsonError("Email is required", 400);
  if (!body.message?.trim()) return jsonError("Message is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: messageId, error } = await supabase.schema("api").rpc("submit_contact_message", {
    p_full_name: body.fullName,
    p_email: body.email,
    p_message: body.message,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  const { data: siteInfo } = await supabase.schema("api").rpc("site_info");
  const contactEmail = (siteInfo as Record<string, unknown> | null)?.["site.contact_email"];
  const staffEmail = typeof contactEmail === "string" ? contactEmail : null;

  if (staffEmail) {
    try {
      await sendEmail({
        to: staffEmail,
        template: {
          name: "contact-message-received",
          data: { fullName: body.fullName, email: body.email, message: body.message },
        },
        entity: { schema: "admin", table: "contact_messages", id: messageId as string },
      });
    } catch (err) {
      console.error("submit-contact-message: staff notification email failed", err);
    }
  } else {
    console.error("submit-contact-message: site.contact_email setting is missing or not a string");
  }

  return new Response(JSON.stringify({ messageId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
