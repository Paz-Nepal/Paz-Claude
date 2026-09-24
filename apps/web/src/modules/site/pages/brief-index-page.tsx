import { formatKathmanduDate } from "@paz/utils";
import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";
import { DocumentHead } from "../components/document-head";
import { useWording } from "../wording";

export function BriefIndexPage() {
  const items = usePublishedItems("brief");
  const w = useWording();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title={w("brief.index-title")}
        description={w("brief.index-intro")}
        path="/brief"
        feedPath="/brief/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("brief.index-title")}</h1>
        <p className="text-muted-foreground">{w("brief.index-intro")}</p>
      </header>
      <SeriesIndexList
        items={items.data}
        basePath="/brief"
        secondary={(item) => (item.published_at ? formatKathmanduDate(item.published_at) : null)}
      />
    </div>
  );
}
