// Templates for every outbound email, versioned in the repo per
// Architecture Blueprint §8 ("every template is versioned in the repo,
// written in the institutional voice -- clear, warm, no urgency theater").
// A template's copy may change freely; a template's *shape* (the data it
// requires) is versioned via EMAIL_TEMPLATE_VERSION so a past send stays
// reconstructable from admin.audit_log even after the copy moves on.
export const EMAIL_TEMPLATE_VERSION = 1;

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatKathmandu(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso)) + " (Kathmandu time)"
  );
}

function wrapHtml(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 13px; color: #6b6b6b;">PAZ, Kathmandu</p>
  </body>
</html>`;
}

export interface ReservationRequestedData {
  code: string;
  fullName: string;
  partySize: number;
  startsAt: string;
  notes?: string | null;
}

export function renderReservationRequested(data: ReservationRequestedData): EmailContent {
  const when = formatKathmandu(data.startsAt);
  const subject = `We've received your reservation request — ${data.code}`;

  const text = [
    `Hello ${data.fullName},`,
    "",
    `We've received your table request for ${data.partySize} on ${when}.`,
    "",
    `Reservation code: ${data.code}`,
    "",
    "A person confirms every reservation here — expect a reply, not an instant confirmation. We'll write back to arrange the details.",
    data.notes ? `\nYour note: ${data.notes}` : "",
    "",
    "— PAZ",
  ]
    .filter(Boolean)
    .join("\n");

  const html = wrapHtml(`
    <p>Hello ${escapeHtml(data.fullName)},</p>
    <p>We've received your table request for <strong>${data.partySize}</strong> on <strong>${escapeHtml(when)}</strong>.</p>
    <p>Reservation code: <strong>${escapeHtml(data.code)}</strong></p>
    <p>A person confirms every reservation here — expect a reply, not an instant confirmation. We'll write back to arrange the details.</p>
    ${data.notes ? `<p>Your note: ${escapeHtml(data.notes)}</p>` : ""}
  `);

  return { subject, text, html };
}
