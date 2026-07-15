import { useAuthContext } from "@/lib/auth-context";

/**
 * Reads authorization state out of the current session's JWT claims (see
 * migration 0007_authz_jwt_claims.sql) — a UI-gating convenience, never the
 * security boundary. RLS re-checks every request against live data via
 * `authz.has_permission()`/`has_staff_permission()` regardless of what this
 * returns.
 */
export function usePermission(permissionKey?: string): boolean {
  const { claims } = useAuthContext();
  if (!permissionKey) return true;
  return claims?.permissions?.includes(permissionKey) ?? false;
}

export function useIsSignedIn(): boolean {
  const { session, loading } = useAuthContext();
  return !loading && session !== null;
}

export function useHasVerifiedMfa(): boolean {
  const { claims } = useAuthContext();
  return claims?.aal === "aal2";
}
