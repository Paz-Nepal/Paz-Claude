// T-040/payments scaffolding. UNRUN: no eSewa merchant credentials exist
// yet (ESEWA_MERCHANT_CODE/ESEWA_SECRET_KEY are unset), so this has never
// executed against eSewa's sandbox or production endpoints -- built ahead
// of the Architecture Blueprint's own Phase 3 scoping, at the user's
// explicit request. See docs/adr/037-online-payment-scaffolding.md.
//
// eSewa ePay v2: the client is redirected (a real browser navigation, not
// an XHR) to a signed form POST at ESEWA_FORM_URL. This function's job is
// only to build that signed payload for a term the caller owns -- it
// never touches membership.terms itself; esewa-payment-callback records
// the payment once eSewa confirms the transaction actually happened.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  const merchantCode = Deno.env.get("ESEWA_MERCHANT_CODE");
  const secretKey = Deno.env.get("ESEWA_SECRET_KEY");
  const formUrl = Deno.env.get("ESEWA_FORM_URL"); // e.g. https://rc-epay.esewa.com.np/api/epay/main/v2/form (test)
  const siteUrl = Deno.env.get("PUBLIC_SITE_URL");
  if (!merchantCode || !secretKey || !formUrl || !siteUrl) {
    return jsonError(
      "eSewa is not configured (ESEWA_MERCHANT_CODE/ESEWA_SECRET_KEY/ESEWA_FORM_URL/PUBLIC_SITE_URL) -- pending real merchant credentials.",
      501,
    );
  }

  let body: { termId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const termId = body.termId;
  if (!termId) {
    return jsonError("termId is required", 400);
  }

  // Anon key + the caller's own JWT: membership.terms' RLS
  // (terms_select_self) is what actually authorizes this read, the same
  // as api.member_terms -- a member can only ever initiate payment for
  // their own term.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  // membership isn't a PostgREST-exposed schema -- api.my_term (0061)
  // wraps the single-row read; its RLS invoker semantics mean it only
  // ever returns a row if the term actually belongs to the caller.
  const { data: term, error } = await supabase.schema("api").rpc("my_term", { p_term: termId });

  if (error) {
    return jsonError(error.message, 400);
  }
  if (!term) {
    return jsonError("Term not found (or not yours)", 404);
  }
  if (term.paid_at) {
    return jsonError("This term is already paid", 409);
  }

  const totalAmount = (term.amount_cents / 100).toFixed(2);
  // eSewa requires a fresh transaction_uuid per attempt (retrying a
  // failed payment reuses the same term but needs a new one), so this
  // isn't just termId -- collisions would make eSewa's own dashboard
  // ambiguous about which attempt a transaction belongs to.
  const transactionUuid = `${termId}-${Date.now()}`;
  const productCode = "EPAYTEST"; // Replace with the real merchant product code once issued.

  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const signature = await hmacSha256Base64(
    secretKey,
    `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`,
  );

  return new Response(
    JSON.stringify({
      formUrl,
      fields: {
        amount: totalAmount,
        tax_amount: "0",
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: `${siteUrl}/account/payment/esewa/callback`,
        failure_url: `${siteUrl}/account/payment/esewa/failed`,
        signed_field_names: signedFieldNames,
        signature,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
