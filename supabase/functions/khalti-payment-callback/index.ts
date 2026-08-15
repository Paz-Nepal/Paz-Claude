// T-040/payments scaffolding. UNRUN -- see initiate-khalti-payment/index.ts
// and docs/adr/037-online-payment-scaffolding.md for the full caveats.
//
// Khalti redirects the browser here (return_url from
// initiate-khalti-payment) with a `pidx` query param. Never trust that
// alone -- look pidx up against Khalti's own lookup API (server-to-server)
// and only record the payment if Khalti itself reports it Completed.
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

  const secretKey = Deno.env.get("KHALTI_SECRET_KEY");
  const lookupUrl = Deno.env.get("KHALTI_LOOKUP_URL"); // e.g. https://a.khalti.com/api/v2/epayment/lookup/
  if (!secretKey || !lookupUrl) {
    return jsonError("Khalti is not configured -- pending real merchant credentials.", 501);
  }

  const url = new URL(req.url);
  const pidx = url.searchParams.get("pidx");
  if (!pidx) {
    return jsonError("Missing pidx param", 400);
  }

  const lookupRes = await fetch(lookupUrl, {
    method: "POST",
    headers: { Authorization: `Key ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pidx }),
  });
  if (!lookupRes.ok) {
    const detail = await lookupRes.text();
    return jsonError(`Khalti lookup failed: ${detail}`, 502);
  }

  const lookupData = (await lookupRes.json()) as {
    status: string;
    total_amount: number;
    purchase_order_id: string;
    transaction_id: string;
  };

  if (lookupData.status !== "Completed") {
    return jsonError(`Khalti reports this payment as ${lookupData.status}, not Completed`, 409);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase.schema("api").rpc("record_online_payment", {
    p_term: lookupData.purchase_order_id,
    p_amount_cents: lookupData.total_amount,
    p_method: "khalti",
    p_ref: lookupData.transaction_id,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
