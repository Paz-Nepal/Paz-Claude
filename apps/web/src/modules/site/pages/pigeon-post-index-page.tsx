import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { usePublishedItems } from "../api/use-site";
import { DocumentHead } from "../components/document-head";
import { useWording } from "../wording";
import { useLocalizedPath } from "../language";

/**
 * A quiet index, not a feed (spec §2/§3): no images, no summaries, no
 * bylines -- just the keepsake editions in order. Contributor identity is
 * never fetched here (api.published_items already nulls author_name for
 * this type), so there's nothing to accidentally render.
 */
export function PigeonPostIndexPage() {
  const items = usePublishedItems("pigeon_post");
  const w = useWording();
  const localize = useLocalizedPath();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <DocumentHead
        title={w("pigeon.index-title")}
        description={w("pigeon.index-intro")}
        path="/pigeon-post"
        feedPath="/pigeon-post/feed.xml"
      />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("pigeon.index-title")}</h1>
        <p className="text-muted-foreground">{w("pigeon.index-intro")}</p>
      </header>
      {items.data &&
        (items.data.length === 0 ? (
          <StatePanel title={w("pigeon.index-empty")} description="" />
        ) : (
          <ul className="flex flex-wrap gap-3">
            {items.data.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/pigeon-post/${item.slug}`}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-black/5"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      <p className="text-sm">
        <Link to={localize("/pigeon-post/where")} className="underline">
          {w("reach.index-link")}
        </Link>
      </p>
    </div>
  );
}
