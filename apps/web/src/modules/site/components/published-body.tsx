import { Navigate } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { formatKathmanduDate } from "@paz/utils";
import {
  publicMediaUrl,
  publishedItemHref,
  useResolveRedirect,
  type PublicItemType,
  type PublishedItemDetail,
} from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { Reveal } from "./paz-editorial";

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

  return (
    <article className="flex flex-col">
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

/**
 * T-049. Drop-in replacement for `<NotPublished />` on any page that
 * looks up a single item by (type, slug): checks whether the slug used
 * to point somewhere before showing the dead-end state, so a renamed
 * item's old links keep working instead of 404ing.
 */
export function NotPublishedOrRedirect({
  type,
  slug,
}: {
  type: PublicItemType;
  slug: string | undefined;
}) {
  const redirect = useResolveRedirect(type, slug, true);

  if (redirect.data) {
    const href = publishedItemHref({ type, slug: redirect.data });
    if (href) return <Navigate to={href} replace />;
  }
  if (redirect.isPending) return null;
  return <NotPublished />;
}
