import { formatKathmanduDate } from "@paz/utils";
import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";
import { DocumentHead } from "../components/document-head";

export function BriefIndexPage() {
  const items = usePublishedItems("brief");

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title="Brief"
        description="The fortnightly bulletin. Sent by email; archived here."
        path="/brief"
        feedPath="/brief/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Brief</h1>
        <p className="text-muted-foreground">
          The fortnightly bulletin. Sent by email; archived here.
        </p>
      </header>
      <SeriesIndexList
        items={items.data}
        basePath="/brief"
        emptyTitle="No issues archived yet."
        secondary={(item) => (item.published_at ? formatKathmanduDate(item.published_at) : null)}
      />
    </div>
  );
}
