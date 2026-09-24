import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { PublishedBody, NotPublished } from "../components/published-body";
import { useWording } from "../wording";

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const w = useWording();
  const item = usePublishedItem("article", slug);

  if (item.isPending)
    return (
      <p role="status" className="text-muted-foreground p-8">
        {w("common.loading")}
      </p>
    );
  if (item.isError) {
    return (
      <div className="p-8">
        <StatePanel title={w("common.load-error")} description={toAppError(item.error).message} />
      </div>
    );
  }
  if (!item.data) return <NotPublished />;
  return <PublishedBody item={item.data} showByline />;
}
