import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { formatKathmanduDate } from "@paz/utils";
import { publicMediaUrl, type PublishedItemDetail } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";

/**
 * Shared rendering for any published item's full view (article or page):
 * featured image, title block, byline, and the ProseMirror body through the
 * shared RichText renderer.
 */
export function PublishedBody({
  item,
  showByline,
}: {
  item: PublishedItemDetail;
  showByline: boolean;
}) {
  const { lang } = useLanguage();
  const body = pickLangDoc(item.body, item.body_ne, lang) as RichTextNode | null;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      {item.featured_media_path && (
        <img
          src={publicMediaUrl(item.featured_media_path)}
          alt={item.featured_media_alt ?? ""}
          className="w-full rounded-lg border object-cover"
        />
      )}
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl">{pickLang(item.title ?? "", item.title_ne, lang)}</h1>
        {item.subtitle && (
          <p className="text-muted-foreground text-xl">
            {pickLang(item.subtitle, item.subtitle_ne, lang)}
          </p>
        )}
        {showByline && (
          <p className="text-muted-foreground text-sm">
            {item.author_name}
            {item.published_at ? ` · ${formatKathmanduDate(item.published_at)}` : ""}
          </p>
        )}
      </header>
      {body && <RichText doc={body} className="rich-text" />}
      {item.tags && item.tags.length > 0 && (
        <p className="text-muted-foreground border-t pt-4 text-sm">{item.tags.join(" · ")}</p>
      )}
    </article>
  );
}

export function NotPublished() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <StatePanel
        title="There's nothing at this address."
        description="The page may have moved, or it may never have existed."
      />
    </div>
  );
}
