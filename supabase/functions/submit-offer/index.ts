// The one intake for the small offers made to the house: a painter showing
// their work, a Sattal proposal, a Table kept elsewhere, a thing or a book
// given, a word the house is looking for, a request to leave. Wraps
// api.submit_offer, which is granted to service_role only, so this function
// and its rate limit are the only way in. No email goes anywhere: an offer
// is read at the desk by whoever holds the permission for its kind.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const KINDS = ["painter", "sattal", "table", "thing", "book", "word", "leaving"] as const;
type Kind = (typeof KINDS)[number];

interface OfferBody {
  kind: Kind;
  name: string;
  contact: string;
  subject?: string;
  note?: string;
  ref?: Record<string, unknown>;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Only the answers each kind asks for are kept; anything else is dropped. */
function cleanRef(kind: Kind, ref: Record<string, unknown> | undefined): Record<string, string> {
  const allowed: Record<Kind, string[]> = {
    painter: ["link"],
    sattal: ["form", "relation"],
    table: ["held_on"],
    thing: [],
    book: ["author"],
    word: [],
    leaving: ["what"],
  };
  const out: Record<string, string> = {};
  for (const key of allowed[kind]) {
    const v = ref?.[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, 500);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  let body: OfferBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!KINDS.includes(body.kind)) return jsonError("Unknown kind of offer", 400);
  if (!body.name?.trim()) return jsonError("A name is required", 400);
  if (!body.contact?.trim()) return jsonError("A way to reach you is required", 400);
  if ((body.note?.length ?? 0) > 4000) return jsonError("That note is too long", 400);
  if ((body.subject?.length ?? 0) > 300) return jsonError("That subject is too long", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { allowed } = await checkRateLimit(supabase, req, "submit-offer", {
    maxCount: 5,
    windowMinutes: 60,
  });
  if (!allowed) {
    return jsonError("Too many submissions. Try again later.", 429);
  }

  const { error } = await supabase.schema("api").rpc("submit_offer", {
    p_kind: body.kind,
    p_name: body.name,
    p_contact: body.contact,
    p_subject: body.subject ?? null,
    p_note: body.note ?? null,
    p_ref: cleanRef(body.kind, body.ref),
  });
  if (error) {
    return jsonError(error.message, 400);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
