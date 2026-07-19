import { usePublishedItems } from "../api/use-site";
import { SeriesIndexList } from "../components/series-index-list";

export function AnnualIndexPage() {
  const items = usePublishedItems("annual");

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Annual</h1>
        <p className="text-muted-foreground">
          The cloth-bound flagship, published at the yearly anniversary.
        </p>
      </header>
      <SeriesIndexList items={items.data} basePath="/annual" emptyTitle="No editions deposited yet." />
    </div>
  );
}
