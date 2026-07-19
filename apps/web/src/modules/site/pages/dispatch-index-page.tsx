import { formatKathmanduDate } from "@paz/utils";
import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";

export function DispatchIndexPage() {
  const items = usePublishedItems("dispatch");

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Dispatch</h1>
        <p className="text-muted-foreground">Announcements, roughly quarterly.</p>
      </header>
      <SeriesIndexList
        items={items.data}
        basePath="/dispatch"
        emptyTitle="No issues archived yet."
        secondary={(item) => (item.published_at ? formatKathmanduDate(item.published_at) : null)}
      />
    </div>
  );
}
