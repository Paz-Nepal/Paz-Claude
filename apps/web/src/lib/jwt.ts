/**
 * Decodes the claims payload of a JWT without verifying its signature.
 * Safe to use client-side ONLY for reading claims already trusted because
 * they arrived over `supabase.auth`'s own session handling (which verifies
 * the token before establishing a session) — never use this to authenticate
 * a token from an untrusted source. UI-gating only; RLS is the real
 * boundary (see migration 0007_authz_jwt_claims.sql).
 */
export interface AppJwtClaims {
  sub?: string;
  aal?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

export function decodeJwtClaims(token: string): AppJwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payload = parts[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as AppJwtClaims;
  } catch {
    return null;
  }
}
