import { Link } from "react-router-dom";
import { formatKathmanduDate } from "@paz/utils";
import { publicMediaUrl, type PublishedItem } from "../api/use-site";
import { useLanguage, pickLang, useLocalizedPath } from "../language";

export function ArticleCard({ item }: { item: PublishedItem }) {
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  return (
    <article className="flex flex-col gap-2">
      <Link to={localize(`/journal/${item.slug}`)} className="group flex flex-col gap-2">
        {item.featured_media_path && (
          <img
            src={publicMediaUrl(item.featured_media_path)}
            alt={item.featured_media_alt ?? ""}
            className="aspect-[3/2] w-full rounded-lg border object-cover"
            loading="lazy"
          />
        )}
        <h3 className="font-serif text-xl group-hover:underline">
          {pickLang(item.title ?? "", item.title_ne, lang)}
        </h3>
      </Link>
      {item.summary && (
        <p className="text-muted-foreground text-sm">
          {pickLang(item.summary, item.summary_ne, lang)}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        {item.author_name}
        {item.published_at ? ` · ${formatKathmanduDate(item.published_at)}` : ""}
      </p>
    </article>
  );
}
