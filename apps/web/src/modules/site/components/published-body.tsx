import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { formatKathmanduDate } from "@paz/utils";
import { publicMediaUrl, type PublishedItemDetail } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { Reveal } from "./paz-editorial";
import { DocumentHead } from "./document-head";

/**
 * Shared rendering for any published item's full view (article or page):
 * featured image, title block, byline, and the ProseMirror body through the
 * shared RichText renderer. Every plain CMS page (About, the six organs
 * that don't have a dedicated hub component, Contact, …) renders through
 * this, so its typography is the site's editorial baseline.
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
  const title = pickLang(item.title ?? "", item.title_ne, lang);
  const description = pickLang(
    item.summary || item.subtitle || "",
    item.summary_ne || item.subtitle_ne,
    lang,
  );
  const path = item.type === "article" ? `/journal/${item.slug}` : `/${item.slug}`;

  return (
    <article className="flex flex-col">
      <DocumentHead
        title={title}
        description={description || "PAZ, a hospitality-led cultural institution in Kathmandu."}
        path={path}
        ogType="article"
        ogImage={item.featured_media_path ? publicMediaUrl(item.featured_media_path) : null}
        depositRef={item.deposit_ref}
      />
      {item.featured_media_path && (
        <div className="w-full overflow-hidden">
          <img
            src={publicMediaUrl(item.featured_media_path)}
            alt={item.featured_media_alt ?? ""}
            className="h-[42vh] w-full object-cover md:h-[52vh]"
          />
        </div>
      )}
      <header className="border-border w-wide flex flex-col gap-2 border-b pb-16 pt-16 md:pb-20 md:pt-24">
        <Reveal>
          <h1 className="type-h1 max-w-4xl">{pickLang(item.title ?? "", item.title_ne, lang)}</h1>
        </Reveal>
        {item.subtitle && (
          <Reveal delay={100}>
            <p className="type-body-lg mt-4 max-w-2xl">
              {pickLang(item.subtitle, item.subtitle_ne, lang)}
            </p>
          </Reveal>
        )}
        {showByline && (
          <p className="type-small mt-2">
            {item.author_name}
            {item.published_at ? ` · ${formatKathmanduDate(item.published_at)}` : ""}
          </p>
        )}
      </header>
      <div className="w-reading py-16">
        {body && <RichText doc={body} className="rich-text" />}
        {item.tags && item.tags.length > 0 && (
          <p className="type-small border-border mt-8 border-t pt-4">{item.tags.join(" · ")}</p>
        )}
      </div>
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
