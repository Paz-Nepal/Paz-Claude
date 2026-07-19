import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { usePublishedItems } from "../api/use-site";

/**
 * A quiet index, not a feed (spec §2/§3): no images, no summaries, no
 * bylines -- just the keepsake editions in order. Contributor identity is
 * never fetched here (api.published_items already nulls author_name for
 * this type), so there's nothing to accidentally render.
 */
export function PigeonPostIndexPage() {
  const items = usePublishedItems("pigeon_post");

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Pigeon Post</h1>
        <p className="text-muted-foreground">The art of noticing. A quiet, anonymous keepsake.</p>
      </header>
      {items.data &&
        (items.data.length === 0 ? (
          <StatePanel title="No editions archived yet." description="" />
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
    </div>
  );
}
