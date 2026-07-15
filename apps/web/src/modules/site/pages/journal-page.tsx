import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItems } from "../api/use-site";
import { ArticleCard } from "../components/article-card";

export function JournalPage() {
  const articles = usePublishedItems("article");

  return (
    <div className="max-w-wide mx-auto flex flex-col gap-8 px-6 py-16">
      <h1 className="font-serif text-3xl">Journal</h1>
      {articles.isPending && <p className="text-muted-foreground">Loading…</p>}
      {articles.isError && (
        <StatePanel
          title="Couldn't load the journal."
          description={toAppError(articles.error).message}
        />
      )}
      {articles.data &&
        (articles.data.length === 0 ? (
          <StatePanel title="Nothing published yet." description="New writing will appear here." />
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {articles.data.map((item) => (
              <ArticleCard key={item.id} item={item} />
            ))}
          </div>
        ))}
    </div>
  );
}
