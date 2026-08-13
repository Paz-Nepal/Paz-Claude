// Public intake for hospitality reservation requests. Wraps
// api.request_reservation (the database RPC that does the actual
// validation and insert) with the one side effect a database function
// should never own directly: telling the person who just asked for a
// table that we got their request (Architecture Blueprint §8, "two-lane
// design" -- PostgREST for the write, Edge Functions for side effects).
//
// Forwards the caller's own Authorization header to the RPC so RLS and
// authz.current_person_id() behave exactly as they would for a direct
// client call -- this function adds a notification step, it does not
// change who the reservation belongs to.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

interface RequestReservationBody {
  fullName: string;
  email: string | null;
  phone: string | null;
  partySize: number;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  occasion: string | null;
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

  let body: RequestReservationBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.fullName?.trim()) return jsonError("Full name is required", 400);
  if (!body.partySize || body.partySize < 1) return jsonError("Party size is required", 400);
  if (!body.startsAt) return jsonError("Reservation time is required", 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: code, error } = await supabase.schema("api").rpc("request_reservation", {
    p_full_name: body.fullName,
    p_email: body.email,
    p_phone: body.phone,
    p_party_size: body.partySize,
    p_starts_at: body.startsAt,
    p_duration_minutes: body.durationMinutes,
    p_notes: body.notes,
    p_occasion: body.occasion,
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  if (body.email) {
    try {
      await sendEmail({
        to: body.email,
        template: {
          name: "reservation-requested",
          data: {
            code: code as string,
            fullName: body.fullName,
            partySize: body.partySize,
            startsAt: body.startsAt,
            notes: body.notes,
          },
        },
        entity: { schema: "hospitality", table: "reservations", id: null },
        context: { reservation_code: code },
      });
    } catch (err) {
      // The reservation is already recorded -- a failed notification is
      // logged inside sendEmail and must never hide the reservation code
      // from the person who just requested it.
      console.error("request-reservation: confirmation email failed", err);
    }
  }

  return new Response(JSON.stringify({ code }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
