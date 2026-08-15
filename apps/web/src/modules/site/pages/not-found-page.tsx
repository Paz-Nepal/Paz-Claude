import { Link, useLocation } from "react-router-dom";
import { PageHero, ArrowLink } from "../components/paz-editorial";
import { DocumentHead } from "../components/document-head";
import { useLocalizedPath } from "../language";

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
  return (
    <div className="flex min-h-[70vh] flex-col">
      <DocumentHead
        title="Not found"
        description="This reference does not resolve. The Record is the authority on everything this house has deposited."
        path={pathname}
        noindex
      />
      <PageHero
        kicker="This reference does not resolve"
        title="Nothing is kept at this address"
        subtitle="The link may be old, mistyped, or the item it pointed to may never have existed. Nothing here was silently redirected to the homepage."
      />
      <div className="w-reading flex flex-col gap-6 pb-24">
        <p className="type-body">
          The Record is the authority on everything this house has deposited. If you were looking
          for something specific, that is the place to start.
        </p>
        <div className="flex flex-wrap gap-6">
          <ArrowLink to="/the-record">Go to the Record</ArrowLink>
          <ArrowLink to="/">Return home</ArrowLink>
        </div>
        <p className="type-small border-border border-t pt-6">
          Have a link that used to work?{" "}
          <Link to={localize("/contact")} className="link-underline">
            Tell us
          </Link>
          , so we can point it to the right place.
        </p>
      </div>
    </div>
  );
}
