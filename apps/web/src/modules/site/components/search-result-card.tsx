import { Link } from "react-router-dom";
import { formatKathmanduDate } from "@paz/utils";
import { publicMediaUrl, publishedItemHref, type PublishedItem } from "../api/use-site";
import { useLanguage, pickLang, useLocalizedPath } from "../language";

const TYPE_LABELS: Record<PublishedItem["type"] & string, string> = {
  article: "Journal",
  page: "Page",
  paper: "Papers",
  dispatch: "Dispatch",
  pigeon_post: "Pigeon Post",
  brief: "Brief",
  annual: "Annual",
  event: "Event",
};

export function SearchResultCard({ item }: { item: PublishedItem }) {
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const href = publishedItemHref(item);
  const title = pickLang(item.title ?? "", item.title_ne, lang);

  const body = (
    <>
      {item.featured_media_path && (
        <img
          src={publicMediaUrl(item.featured_media_path)}
          alt={item.featured_media_alt ?? ""}
          className="aspect-[3/2] w-full rounded-lg border object-cover"
          loading="lazy"
        />
      )}
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {item.type ? TYPE_LABELS[item.type] : null}
      </p>
      <h3 className="font-serif text-xl">{title}</h3>
      {item.summary && (
        <p className="text-muted-foreground text-sm">
          {pickLang(item.summary, item.summary_ne, lang)}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        {item.author_name}
        {item.published_at ? ` · ${formatKathmanduDate(item.published_at)}` : ""}
      </p>
    </>
  );

  return (
    <article className="flex flex-col gap-2">
      {href ? (
        <Link to={localize(href)} className="group flex flex-col gap-2">
          {body}
        </Link>
      ) : (
        <div className="flex flex-col gap-2">{body}</div>
      )}
    </article>
  );
}
