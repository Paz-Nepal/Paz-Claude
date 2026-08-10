// The one path every Edge Function uses to notify a person by email.
// Architecture Blueprint §8: "All outbound email goes through one internal
// send-email utility wrapping a provider... every send is logged to
// admin.audit_log." Nothing outside this file should import resend.ts or
// call admin.audit_log for a notification -- that keeps a provider swap
// (ADR-11: Resend today) a one-file change.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendViaResend } from "./resend.ts";
import {
  EMAIL_TEMPLATE_VERSION,
  renderReservationRequested,
  type ReservationRequestedData,
} from "./email-templates.ts";

export type EmailTemplate = {
  name: "reservation-requested";
  data: ReservationRequestedData;
};

function render(template: EmailTemplate) {
  switch (template.name) {
    case "reservation-requested":
      return renderReservationRequested(template.data);
  }
}

export interface SendEmailInput {
  to: string;
  template: EmailTemplate;
  /** The row this notification is about, if it has a stable uuid. */
  entity?: { schema: string; table: string; id: string | null };
  /** Extra fields folded into the logged context, e.g. a human-readable code. */
  context?: Record<string, unknown>;
}

/**
 * Renders a versioned template, sends it via the configured provider, and
 * logs the attempt to admin.audit_log -- success or failure. Throws only
 * after logging, so a caller can decide whether a failed send should block
 * the operation it was notifying about (usually it should not: the
 * database write already happened and must not be hidden from the person
 * who just made it).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const content = render(input.template);

  let errorMessage: string | null = null;
  try {
    await sendViaResend({
      to: input.to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // PII minimized at write time (admin.audit_log doctrine): the recipient's
  // domain, never the full address, goes into context.
  const toDomain = input.to.split("@")[1] ?? null;

  const { error: logError } = await supabaseAdmin.schema("api").rpc("log_system_event", {
    p_action: errorMessage ? "notification.email.failed" : "notification.email.sent",
    p_entity_schema: input.entity?.schema ?? null,
    p_entity_table: input.entity?.table ?? null,
    p_entity_id: input.entity?.id ?? null,
    p_context: {
      template: input.template.name,
      template_version: EMAIL_TEMPLATE_VERSION,
      to_domain: toDomain,
      error: errorMessage,
      ...input.context,
    },
  });

  if (logError) {
    // The send itself already happened (or failed) -- a broken audit
    // write must not be mistaken for a broken send, so this only logs to
    // the function's own console output, it never throws.
    console.error("send-email: failed to write admin.audit_log entry", logError);
  }

  if (errorMessage) {
    throw new Error(`Email send failed: ${errorMessage}`);
  }
}
