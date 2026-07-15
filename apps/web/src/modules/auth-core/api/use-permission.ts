import { useAuthorization } from "./use-authorization";

/**
 * UI-gating convenience over {@link useAuthorization} — never the security
 * boundary; RLS re-checks every request against live data.
 */
export function usePermission(permissionKey?: string): boolean {
  const { permissions } = useAuthorization();
  if (!permissionKey) return true;
  return permissions.includes(permissionKey);
}
