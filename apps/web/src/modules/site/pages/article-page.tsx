import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { PublishedBody, NotPublished } from "../components/published-body";

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const item = usePublishedItem("article", slug);

  if (item.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (item.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(item.error).message} />
      </div>
    );
  }
  if (!item.data) return <NotPublished />;
  return <PublishedBody item={item.data} showByline />;
}
