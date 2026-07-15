import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { useAuthContext } from "@/lib/auth-context";
import { usePermission, useHasVerifiedMfa } from "../api/use-permission";

export interface ProtectedRouteProps {
  /** Permission key required to view the matched routes (see docs/authz-matrix.md). Omit to only require sign-in. */
  permission?: string;
  /**
   * Every permission this app checks is a staff permission (`has_staff_permission`
   * in the database), which requires MFA. Defaults to `true` whenever a
   * `permission` is given; pass `false` explicitly for a signed-in-only
   * route that isn't gated by a staff permission.
   */
  requireMfa?: boolean;
}

/**
 * Route guard used as a layout route (`<ProtectedRoute />` with nested
 * `children`/`<Outlet />`). Redirects to sign-in when signed out, to MFA
 * enrollment when staff access is required but the session hasn't completed
 * a TOTP challenge, and shows a calm "no access" panel otherwise — this is
 * UX only, the same rules are enforced server-side by RLS.
 */
export function ProtectedRoute({
  permission,
  requireMfa = Boolean(permission),
}: ProtectedRouteProps) {
  const { session, loading } = useAuthContext();
  const location = useLocation();
  const hasPermission = usePermission(permission);
  const hasVerifiedMfa = useHasVerifiedMfa();

  if (loading) {
    return <div className="text-muted-foreground p-8">Loading…</div>;
  }

  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  if (requireMfa && !hasVerifiedMfa) {
    return <Navigate to="/admin/mfa-enroll" replace state={{ from: location }} />;
  }

  if (permission && !hasPermission) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <StatePanel
          title="You don't have access to this."
          description="If you think this is a mistake, write to an administrator."
        />
      </div>
    );
  }

  return <Outlet />;
}
