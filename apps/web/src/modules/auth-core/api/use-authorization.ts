import { useQuery } from "@tanstack/react-query";
import { toAppError } from "@paz/types";
import { useAuthContext } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export interface Authorization {
  signedIn: boolean;
  /** True while the initial session restore is still in flight. */
  loading: boolean;
  /** Authenticator assurance level from the session JWT (standard claim). */
  aal: "aal1" | "aal2";
  permissions: readonly string[];
  /** True while permissions are being fetched and are not yet trustworthy. */
  permissionsLoading: boolean;
}

/**
 * The one frontend source of authorization state, for UI gating only — RLS
 * re-checks everything server-side. Permissions come from the JWT's custom
 * claims when the Auth server's custom-access-token hook (migration 0007)
 * has stamped them; otherwise from `api.my_permissions()` — so a
 * misconfigured hook degrades to one extra request, never to a broken
 * admin UI. `aal` is a standard Supabase claim, present without any hook.
 */
export function useAuthorization(): Authorization {
  const { session, claims, loading } = useAuthContext();
  const claimPermissions = claims?.permissions;
  const needsFetch = Boolean(session) && !claimPermissions;

  const query = useQuery({
    queryKey: ["my-permissions", session?.user.id],
    enabled: needsFetch,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.schema("api").rpc("my_permissions");
      if (error) throw toAppError(error);
      return data ?? [];
    },
  });

  return {
    signedIn: Boolean(session),
    loading,
    aal: claims?.aal === "aal2" ? "aal2" : "aal1",
    permissions: claimPermissions ?? query.data ?? [],
    permissionsLoading: needsFetch && query.isPending,
  };
}
