import { Navigate, useLocation } from "react-router-dom";
import { useRedirect } from "../api/use-site";
import { NotFoundPage } from "./not-found-page";

/**
 * Router catch-all target. Checks publishing.redirects (written
 * automatically when a published item's slug/type changes, see migration
 * 0036) before rendering the real 404 -- an old permalink for something
 * that moved should land on the new one, not on a dead end.
 */
export function ResolveNotFoundPage() {
  const { pathname } = useLocation();
  const redirect = useRedirect(pathname);

  if (redirect.isPending) return null;
  if (redirect.data) return <Navigate to={redirect.data} replace />;
  return <NotFoundPage />;
}
