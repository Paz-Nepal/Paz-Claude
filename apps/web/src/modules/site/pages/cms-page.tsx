import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { PublishedBody, NotPublished } from "../components/published-body";

/**
 * Top-level CMS-controlled pages (/about, /visit, /membership, …): any
 * published item of type 'page' whose slug matches the path segment.
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
  if (!item.data) return <NotPublished />;
  return <PublishedBody item={item.data} showByline={false} />;
}
