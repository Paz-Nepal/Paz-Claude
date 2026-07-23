import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";
import { DocumentHead } from "../components/document-head";

export function PapersIndexPage() {
  const items = usePublishedItems("paper");

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title="The Paz Papers"
        description="Long-form essays. Numbered, permanent."
        path="/papers"
        feedPath="/papers/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">The Paz Papers</h1>
        <p className="text-muted-foreground">Long-form essays. Numbered, permanent.</p>
      </header>
      <SeriesIndexList
        items={items.data}
        basePath="/papers"
        emptyTitle="No Papers deposited yet."
      />
    </div>
  );
}
