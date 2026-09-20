import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc, isUntranslatedDoc } from "../language";
import { PageHero } from "../components/paz-editorial";
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

  if (page.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        Loading…
      </p>
    );
  if (page.isError) {
    return (
      <div className="p-16">
        <StatePanel title="Couldn't load this." description={toAppError(page.error).message} />
      </div>
    );
  }
  // An organ exists in law before it has written anything. No holding line
  // is invented in the meantime: the organ shows its own hub and no body.
  const data = page.data ?? null;

  const body = pickLangDoc(data?.body, data?.body_ne, lang) as RichTextNode | null;
  const title = pickLang(data?.title ?? "The Treasury", data?.title_ne, lang);
  const subtitle = data?.subtitle ? pickLang(data?.subtitle, data?.subtitle_ne, lang) : undefined;

  return (
    <div>
      <DocumentHead title={title} description={subtitle || undefined} path="/treasury" />
      <PageHero kicker="An organ of the house" title={title} subtitle={subtitle} />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}
    </div>
  );
}
