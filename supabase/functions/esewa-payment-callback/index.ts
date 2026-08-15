// T-040/payments scaffolding. UNRUN -- see initiate-esewa-payment/index.ts
// and docs/adr/037-online-payment-scaffolding.md for the full caveats.
//
// eSewa redirects the browser here (success_url from
// initiate-esewa-payment) with a `data` query param: base64-encoded JSON
// carrying the transaction result and eSewa's own signature over it. This
// function verifies that signature, double-checks with eSewa's status API
// (never trust the redirect alone -- a redirect URL is client-visible and
// could be replayed or forged), and only then records the payment via
// membership.record_online_payment -- which itself only succeeds once,
// since it requires paid_at is null (0060).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

interface EsewaCallbackData {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secretKey = Deno.env.get("ESEWA_SECRET_KEY");
  const statusUrl = Deno.env.get("ESEWA_STATUS_URL"); // e.g. https://rc.esewa.com.np/api/epay/transaction/status/
  if (!secretKey || !statusUrl) {
    return jsonError("eSewa is not configured -- pending real merchant credentials.", 501);
  }

  const url = new URL(req.url);
  const encoded = url.searchParams.get("data");
  if (!encoded) {
    return jsonError("Missing data param", 400);
  }

  let payload: EsewaCallbackData;
  try {
    payload = JSON.parse(atob(encoded));
  } catch {
    return jsonError("data param is not valid base64-encoded JSON", 400);
  }

  const fields = payload.signed_field_names.split(",");
  const message = fields
    .map((f) => `${f}=${(payload as unknown as Record<string, string>)[f]}`)
    .join(",");
  const expectedSignature = await hmacSha256Base64(secretKey, message);
  if (expectedSignature !== payload.signature) {
    return jsonError("Signature verification failed", 400);
  }

  // Redirect data alone is not proof of payment -- confirm against
  // eSewa's own status endpoint before recording anything.
  const statusRes = await fetch(
    `${statusUrl}?product_code=${payload.product_code}&total_amount=${payload.total_amount}&transaction_uuid=${payload.transaction_uuid}`,
  );
  const statusData = (await statusRes.json()) as { status?: string };
  if (statusData.status !== "COMPLETE") {
    return jsonError(
      `eSewa reports this transaction as ${statusData.status ?? "unknown"}, not COMPLETE`,
      409,
    );
  }

  // transaction_uuid was minted as `${termId}-${Date.now()}` by
  // initiate-esewa-payment -- the term id is everything before the last
  // hyphen-delimited timestamp segment.
  const termId = payload.transaction_uuid.slice(0, payload.transaction_uuid.lastIndexOf("-"));
  const amountCents = Math.round(Number.parseFloat(payload.total_amount) * 100);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase.schema("api").rpc("record_online_payment", {
    p_term: termId,
    p_amount_cents: amountCents,
    p_method: "esewa",
    p_ref: payload.transaction_code,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
