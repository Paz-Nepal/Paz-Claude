// Shared rate-limit check for public intake Edge Functions (pigeon post,
// contact, membership application). This is the actual enforcement point,
// not a nicety layered on top: the underlying api.* RPCs these functions
// wrap are granted to service_role only (see migration 0051), so a caller
// can no longer reach them by skipping this Edge Function and hitting
// PostgREST directly the way an anon-granted RPC could always be. IP-based
// limiting only works at all because Edge Functions -- unlike a plain
// PostgREST RPC call -- actually see the real client address.
//
// The IP is hashed (SHA-256, no salt -- a per-endpoint, time-windowed
// count is the only thing ever read back, so a salt would add nothing)
// before it's ever written to the database: this repo's whole premise is
// no reader tracking, and even a short-lived anti-abuse table shouldn't
// hold raw visitor IPs if a hash serves exactly as well.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  // Supabase's own edge network sets x-forwarded-for with the real client
  // address first in the list. Requests with no such header (shouldn't
  // happen in production, but e.g. a local `supabase functions serve`)
  // fall into one shared "unknown" bucket rather than skipping the check.
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
}

/**
 * `supabase` must be a service-role client -- api.check_rate_limit (a
 * thin wrapper over admin.check_rate_limit, admin not being a
 * PostgREST-exposed schema) is granted to service_role only.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  req: Request,
  endpoint: string,
  { maxCount = 5, windowMinutes = 60 }: { maxCount?: number; windowMinutes?: number } = {},
): Promise<RateLimitResult> {
  const ipHash = await hashIp(clientIp(req));
  const { data, error } = await supabase.schema("api").rpc("check_rate_limit", {
    p_endpoint: endpoint,
    p_ip_hash: ipHash,
    p_max_count: maxCount,
    p_window_minutes: windowMinutes,
  });
  if (error) {
    // Fail open: a broken rate-limit check should never be the reason a
    // real visitor's submission is lost. Logged so it's visible, not
    // silent.
    console.error(`checkRateLimit(${endpoint}): RPC failed, allowing`, error);
    return { allowed: true };
  }
  return { allowed: data === true };
}
