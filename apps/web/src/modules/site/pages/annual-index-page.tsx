import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";
import { DocumentHead } from "../components/document-head";
import { useWording } from "../wording";

export function AnnualIndexPage() {
  const items = usePublishedItems("annual");
  const w = useWording();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title={w("annual.index-title")}
        description={w("annual.index-intro")}
        path="/annual"
        feedPath="/annual/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("annual.index-title")}</h1>
        <p className="text-muted-foreground">{w("annual.index-intro")}</p>
      </header>
      <SeriesIndexList items={items.data} basePath="/annual" />
    </div>
  );
}
