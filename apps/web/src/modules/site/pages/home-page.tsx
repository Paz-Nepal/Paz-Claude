import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { usePublishedItems, useSiteInfo } from "../api/use-site";
import { ArticleCard } from "../components/article-card";

export function HomePage() {
  const siteInfo = useSiteInfo();
  const articles = usePublishedItems("article");

  const siteName = siteInfo.data?.["site.name"] ?? "PAZ";
  const tagline = siteInfo.data?.["site.tagline"];

  return (
    <div className="max-w-wide mx-auto flex flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-serif text-5xl">{siteName}</h1>
        {tagline && <p className="text-muted-foreground max-w-reading text-lg">{tagline}</p>}
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="latest-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="latest-heading" className="font-serif text-2xl">
            From the journal
          </h2>
          <Link to="/journal" className="text-muted-foreground text-sm hover:underline">
            All entries →
          </Link>
        </div>
        {articles.data &&
          (articles.data.length === 0 ? (
            <StatePanel
              title="Nothing published yet."
              description="New writing will appear here."
            />
          ) : (
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {articles.data.slice(0, 6).map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
            </div>
          ))}
      </section>
    </div>
  );
}
