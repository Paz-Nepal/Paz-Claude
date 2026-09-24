import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc, isUntranslatedDoc } from "../language";
import { TreasuryAccounts } from "./more-pages";
import { PageHero } from "../components/paz-editorial";
import { DocumentHead } from "../components/document-head";
import { TranslationNotice } from "../components/translation-notice";
import { useWording } from "../wording";

/**
 * Site audit, 18 Sept 2026: "Two of the six organs, the Guild and the
 * Treasury, have no page component of their own while House, Hearth,
 * Press and Record do... All six are shown alike." Same shape as
 * guild-page.tsx.
 */
export function TreasuryPage() {
  const page = usePublishedItem("page", "treasury");
  const { lang } = useLanguage();
  const w = useWording();

  if (page.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        {w("common.loading")}
      </p>
    );
  if (page.isError) {
    return (
      <div className="p-16">
        <StatePanel title={w("common.load-error")} description={toAppError(page.error).message} />
      </div>
    );
  }
  // An organ exists in law before it has written anything. No holding line
  // is invented in the meantime: the organ shows its own hub and no body.
  const data = page.data ?? null;

  const body = pickLangDoc(data?.body, data?.body_ne, lang) as RichTextNode | null;
  const title = pickLang(data?.title ?? w("organ.treasury"), data?.title_ne, lang);
  const subtitle = data?.subtitle ? pickLang(data?.subtitle, data?.subtitle_ne, lang) : undefined;

  return (
    <div>
      <DocumentHead title={title} description={subtitle || undefined} path="/treasury" />
      <PageHero kicker={w("organ.kicker")} title={title} subtitle={subtitle} />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}
      <TreasuryAccounts />
    </div>
  );
}
