import { Navigate, useLocation } from "react-router-dom";
import { useRedirect } from "../api/use-site";
import { useLanguage } from "../language";
import { NotFoundPage } from "./not-found-page";

/**
 * Router catch-all target. Checks publishing.redirects (written
 * automatically when a published item's slug/type changes, see migration
 * 0036) before rendering the real 404 -- an old permalink for something
 * that moved should land on the new one, not on a dead end.
 *
 * publishing.redirects stores bare, unprefixed paths ("/papers/slug") --
 * the trigger that writes them has no notion of the "/ne" tree, and
 * doesn't need one: a slug rename is one row, one trigger fire, and
 * applies to both languages' reading of the same item. So the lookup
 * strips "/ne" before checking the table and adds it back onto whatever
 * match comes back, rather than needing every redirect duplicated per
 * language.
 */
export function ResolveNotFoundPage() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const bare = lang === "ne" ? pathname.replace(/^\/ne(\/|$)/, "/") : pathname;
  const redirect = useRedirect(bare);

  if (redirect.isPending) return null;
  if (redirect.data) {
    const target = lang === "ne" ? `/ne${redirect.data}` : redirect.data;
    return <Navigate to={target} replace />;
  }
  return <NotFoundPage />;
}
