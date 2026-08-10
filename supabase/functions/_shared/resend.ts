// Thin wrapper around the Resend HTTP API -- deliberately not the Resend
// npm SDK, so this file has no dependency beyond `fetch`. This is the ONLY
// file in the repo allowed to know Resend's request shape; swapping
// providers (ADR-11 names Resend or Postmark) means replacing this file
// alone, nothing that calls send-email.ts changes.
const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendViaResendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendViaResend(input: SendViaResendInput): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!from) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${body}`);
  }
}
