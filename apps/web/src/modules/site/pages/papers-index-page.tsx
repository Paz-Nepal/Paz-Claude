import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";
import { DocumentHead } from "../components/document-head";
import { useWording } from "../wording";

export function PapersIndexPage() {
  const items = usePublishedItems("paper");
  const w = useWording();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title={w("papers.title")}
        description={w("papers.intro")}
        path="/papers"
        feedPath="/papers/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("papers.title")}</h1>
        <p className="text-muted-foreground">{w("papers.intro")}</p>
      </header>
      <SeriesIndexList items={items.data} basePath="/papers" />
    </div>
  );
}
