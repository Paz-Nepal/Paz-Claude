import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc, isUntranslatedDoc } from "../language";
import { PageHero } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";
import { DocumentHead } from "../components/document-head";
import { TranslationNotice } from "../components/translation-notice";

/**
 * Site audit, 18 Sept 2026: "Two of the six organs, the Guild and the
 * Treasury, have no page component of their own while House, Hearth,
 * Press and Record do... All six are shown alike." Same shape as
 * guild-page.tsx.
 */
export function TreasuryPage() {
  const page = usePublishedItem("page", "treasury");
  const { lang } = useLanguage();

  if (page.isPending) return <p className="type-small p-16 text-center">Loading…</p>;
  if (page.isError) {
    return (
      <div className="p-16">
        <StatePanel title="Couldn't load this." description={toAppError(page.error).message} />
      </div>
    );
  }
  if (!page.data) return <NotPublished />;

  const body = pickLangDoc(page.data.body, page.data.body_ne, lang) as RichTextNode | null;
  const title = pickLang(page.data.title ?? "The Treasury", page.data.title_ne, lang);
  const subtitle = page.data.subtitle
    ? pickLang(page.data.subtitle, page.data.subtitle_ne, lang)
    : undefined;

  return (
    <div>
      <DocumentHead title={title} description={subtitle || undefined} path="/treasury" />
      <PageHero kicker="An organ of the house" title={title} subtitle={subtitle} />
      {(isUntranslatedDoc(page.data.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(page.data.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}
    </div>
  );
}
