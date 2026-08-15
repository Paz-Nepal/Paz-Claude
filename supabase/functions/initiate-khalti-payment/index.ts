// T-040/payments scaffolding. UNRUN: no Khalti merchant credentials exist
// yet (KHALTI_SECRET_KEY is unset) -- built ahead of the Architecture
// Blueprint's own Phase 3 scoping, at the user's explicit request. See
// docs/adr/037-online-payment-scaffolding.md.
//
// Khalti's ePayment (KPG-2) flow: a server-to-server call gets back a
// payment_url the browser is redirected to; Khalti then redirects back
// to return_url with a `pidx` query param, which khalti-payment-callback
// looks up (server-to-server again) to confirm before recording anything.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

  const secretKey = Deno.env.get("KHALTI_SECRET_KEY");
  const initiateUrl = Deno.env.get("KHALTI_INITIATE_URL"); // e.g. https://a.khalti.com/api/v2/epayment/initiate/
  const siteUrl = Deno.env.get("PUBLIC_SITE_URL");
  if (!secretKey || !initiateUrl || !siteUrl) {
    return jsonError(
      "Khalti is not configured (KHALTI_SECRET_KEY/KHALTI_INITIATE_URL/PUBLIC_SITE_URL) -- pending real merchant credentials.",
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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

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

  const khaltiRes = await fetch(initiateUrl, {
    method: "POST",
    headers: { Authorization: `Key ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      return_url: `${siteUrl}/account/payment/khalti/callback`,
      website_url: siteUrl,
      amount: term.amount_cents, // Khalti's "amount" is paisa, same unit as amount_cents.
      purchase_order_id: term.id,
      purchase_order_name: `PAZ membership term ${term.id}`,
    }),
  });

  if (!khaltiRes.ok) {
    const detail = await khaltiRes.text();
    return jsonError(`Khalti initiate failed: ${detail}`, 502);
  }

  const khaltiData = (await khaltiRes.json()) as { pidx: string; payment_url: string };
  return new Response(
    JSON.stringify({ paymentUrl: khaltiData.payment_url, pidx: khaltiData.pidx }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
