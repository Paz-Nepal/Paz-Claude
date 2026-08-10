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

export interface MembershipApplicationReceivedData {
  fullName: string;
  tierName: string;
}

export function renderMembershipApplicationReceived(
  data: MembershipApplicationReceivedData,
): EmailContent {
  const subject = "We've received your membership application";

  const text = [
    `Hello ${data.fullName},`,
    "",
    `We've received your application for ${data.tierName} membership.`,
    "",
    "A person reviews every application — there's no automatic approval. We'll write again once a decision has been made.",
    "",
    "— PAZ",
  ].join("\n");

  const html = wrapHtml(`
    <p>Hello ${escapeHtml(data.fullName)},</p>
    <p>We've received your application for <strong>${escapeHtml(data.tierName)}</strong> membership.</p>
    <p>A person reviews every application — there's no automatic approval. We'll write again once a decision has been made.</p>
  `);

  return { subject, text, html };
}

export interface MembershipApplicationDecidedData {
  fullName: string;
  tierName: string;
  decision: "accepted" | "declined";
  notes?: string | null;
}

export function renderMembershipApplicationDecided(
  data: MembershipApplicationDecidedData,
): EmailContent {
  if (data.decision === "accepted") {
    const subject = "Your PAZ membership application has been accepted";
    const text = [
      `Hello ${data.fullName},`,
      "",
      `Your application for ${data.tierName} membership has been accepted — welcome.`,
      "",
      "Your membership record and first term are set up on our end. We'll be in touch with what comes next.",
      data.notes ? `\nA note from the person who reviewed your application: ${data.notes}` : "",
      "",
      "— PAZ",
    ]
      .filter(Boolean)
      .join("\n");
    const html = wrapHtml(`
      <p>Hello ${escapeHtml(data.fullName)},</p>
      <p>Your application for <strong>${escapeHtml(data.tierName)}</strong> membership has been accepted — welcome.</p>
      <p>Your membership record and first term are set up on our end. We'll be in touch with what comes next.</p>
      ${data.notes ? `<p>A note from the person who reviewed your application: ${escapeHtml(data.notes)}</p>` : ""}
    `);
    return { subject, text, html };
  }

  const subject = "About your PAZ membership application";
  const text = [
    `Hello ${data.fullName},`,
    "",
    `Your application for ${data.tierName} membership was not accepted this time.`,
    data.notes ? `\n${data.notes}` : "",
    "",
    "You're welcome to apply again in the future.",
    "",
    "— PAZ",
  ]
    .filter(Boolean)
    .join("\n");
  const html = wrapHtml(`
    <p>Hello ${escapeHtml(data.fullName)},</p>
    <p>Your application for <strong>${escapeHtml(data.tierName)}</strong> membership was not accepted this time.</p>
    ${data.notes ? `<p>${escapeHtml(data.notes)}</p>` : ""}
    <p>You're welcome to apply again in the future.</p>
  `);
  return { subject, text, html };
}

export interface SessionRegistrationData {
  fullName: string;
  programTitle: string;
  startsAt: string;
  status: "registered" | "waitlisted";
}

export function renderSessionRegistration(data: SessionRegistrationData): EmailContent {
  const when = formatKathmandu(data.startsAt);

  if (data.status === "waitlisted") {
    const subject = `You're on the waitlist — ${data.programTitle}`;
    const text = [
      `Hello ${data.fullName},`,
      "",
      `${data.programTitle} on ${when} is full — you're on the waitlist.`,
      "",
      "If a seat opens up, you'll be moved in automatically and we'll write to confirm.",
      "",
      "— PAZ",
    ].join("\n");
    const html = wrapHtml(`
      <p>Hello ${escapeHtml(data.fullName)},</p>
      <p><strong>${escapeHtml(data.programTitle)}</strong> on <strong>${escapeHtml(when)}</strong> is full — you're on the waitlist.</p>
      <p>If a seat opens up, you'll be moved in automatically and we'll write to confirm.</p>
    `);
    return { subject, text, html };
  }

  const subject = `You're registered — ${data.programTitle}`;
  const text = [
    `Hello ${data.fullName},`,
    "",
    `You're registered for ${data.programTitle} on ${when}.`,
    "",
    "— PAZ",
  ].join("\n");
  const html = wrapHtml(`
    <p>Hello ${escapeHtml(data.fullName)},</p>
    <p>You're registered for <strong>${escapeHtml(data.programTitle)}</strong> on <strong>${escapeHtml(when)}</strong>.</p>
  `);
  return { subject, text, html };
}

export interface ContactMessageReceivedData {
  fullName: string;
  email: string;
  message: string;
}

/**
 * Staff-facing, not the submitter -- D-13 scopes automated email to
 * transactional/membership-lifecycle sends, and a contact message is
 * neither, so nothing gets sent back to whoever wrote in (see the
 * comment on api.submit_contact_message, migration 0037).
 */
export function renderContactMessageReceived(data: ContactMessageReceivedData): EmailContent {
  const subject = `New contact message from ${data.fullName}`;

  const text = [
    `A new message came in through the contact form.`,
    "",
    `From: ${data.fullName} <${data.email}>`,
    "",
    data.message,
    "",
    "Review and reply directly to their email address — this address does not receive replies.",
  ].join("\n");

  const html = wrapHtml(`
    <p>A new message came in through the contact form.</p>
    <p><strong>From:</strong> ${escapeHtml(data.fullName)} &lt;${escapeHtml(data.email)}&gt;</p>
    <p>${escapeHtml(data.message)}</p>
    <p>Review and reply directly to their email address — this address does not receive replies.</p>
  `);

  return { subject, text, html };
}

export interface MembershipRenewalNoticeData {
  fullName: string;
  tierName: string;
  endsOn: string; // plain calendar date (YYYY-MM-DD), not a timestamp
  noticeKind: "30d" | "7d";
}

function formatCalendarDate(isoDate: string): string {
  // isoDate is a plain date (no time component) -- parsed as UTC midnight
  // so it renders as the same calendar date everywhere, never shifted a
  // day by the reader's or server's local timezone.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function renderMembershipRenewalNotice(data: MembershipRenewalNoticeData): EmailContent {
  const when = formatCalendarDate(data.endsOn);
  const subject =
    data.noticeKind === "7d"
      ? `Reminder: your PAZ membership ends ${when}`
      : `Your PAZ membership renews soon`;

  const urgencyLine =
    data.noticeKind === "7d"
      ? `This is a reminder — your ${data.tierName} membership ends ${when}.`
      : `Your ${data.tierName} membership ends ${when}.`;

  const text = [
    `Hello ${data.fullName},`,
    "",
    urgencyLine,
    "",
    "Renewing keeps your membership continuous — get in touch and we'll record your renewal. If it lapses, there's a 30-day grace period before member benefits pause, and reactivating later is still possible without a fresh application.",
    "",
    "— PAZ",
  ].join("\n");

  const html = wrapHtml(`
    <p>Hello ${escapeHtml(data.fullName)},</p>
    <p>${escapeHtml(urgencyLine)}</p>
    <p>Renewing keeps your membership continuous — get in touch and we'll record your renewal. If it lapses, there's a 30-day grace period before member benefits pause, and reactivating later is still possible without a fresh application.</p>
  `);

  return { subject, text, html };
}
