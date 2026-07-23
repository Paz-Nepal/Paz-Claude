import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { PublishedBody } from "../components/published-body";
import { ResolveNotFoundPage } from "./resolve-not-found-page";

/**
 * Top-level CMS-controlled pages (/about, /visit, /membership, …): any
 * published item of type 'page' whose slug matches the path segment.
 *
 * A single path segment always matches this route ahead of the router's
 * "*" catch-all (React Router ranks a dynamic segment above a splat), so
 * this is the only place a one-segment broken link -- an old page slug --
 * is ever checked against publishing.redirects. Falls through to
 * ResolveNotFoundPage, which does that check before rendering a real 404.
 */
export function CmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const item = usePublishedItem("page", slug);

  if (item.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (item.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(item.error).message} />
      </div>
    );
  }
  if (!item.data) return <ResolveNotFoundPage />;
  return <PublishedBody item={item.data} showByline={false} />;
}
