import { Link, useLocation } from "react-router-dom";
import { PageHero, ArrowLink } from "../components/paz-editorial";
import { DocumentHead } from "../components/document-head";
import { useLocalizedPath } from "../language";
import { useWording } from "../wording";

/**
 * A real 404, not a silent redirect to the homepage. Work plan Part II, #7:
 * a broken permalink that quietly lands on "/" reads to a crawler or an
 * archive as a soft-404, and to a person following an old citation as no
 * signal that anything was ever there. This says plainly that the
 * reference doesn't resolve, and gives two real ways back in: the Record,
 * which is the actual authority on everything the house has kept, and
 * search.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();
  const localize = useLocalizedPath();
  const w = useWording();
  return (
    <div className="flex min-h-[70vh] flex-col">
      <DocumentHead
        title={w("notfound.title")}
        description={w("notfound.description")}
        path={pathname}
        noindex
      />
      <PageHero
        kicker={w("notfound.kicker")}
        title={w("notfound.heading")}
        subtitle={w("notfound.subtitle")}
      />
      <div className="w-reading flex flex-col gap-6 pb-24">
        <p className="type-body">{w("notfound.record-note")}</p>
        <div className="flex flex-wrap gap-6">
          <ArrowLink to="/record/deposits">{w("notfound.go-record")}</ArrowLink>
          <ArrowLink to="/">{w("notfound.home")}</ArrowLink>
        </div>
        <p className="type-small border-border border-t pt-6">
          {w("notfound.old-link")}{" "}
          <Link to={localize("/contact")} className="link-underline">
            {w("notfound.tell-us")}
          </Link>
          {w("notfound.old-link-end")}
        </p>
      </div>
    </div>
  );
}
