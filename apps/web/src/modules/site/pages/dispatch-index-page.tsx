import { formatKathmanduDate } from "@paz/utils";
import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";
import { DocumentHead } from "../components/document-head";
import { useWording } from "../wording";

export function DispatchIndexPage() {
  const items = usePublishedItems("dispatch");
  const w = useWording();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title={w("dispatch.index-title")}
        description={w("dispatch.index-intro")}
        path="/dispatch"
        feedPath="/dispatch/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("dispatch.index-title")}</h1>
        <p className="text-muted-foreground">{w("dispatch.index-intro")}</p>
      </header>
      <SeriesIndexList
        items={items.data}
        basePath="/dispatch"
        secondary={(item) => (item.published_at ? formatKathmanduDate(item.published_at) : null)}
      />
    </div>
  );
}
