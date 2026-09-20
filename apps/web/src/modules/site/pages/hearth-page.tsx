import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc, isUntranslatedDoc } from "../language";
import { PageHero } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";
import { TranslationNotice } from "../components/translation-notice";

export function HearthPage() {
  const page = usePublishedItem("page", "hearth");
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
  if (!page.data) return <NotPublished />;

  const body = pickLangDoc(page.data.body, page.data.body_ne, lang) as RichTextNode | null;

  return (
    <div>
      <PageHero
        kicker="An organ of the house"
        title={pickLang(page.data.title ?? "The Hearth", page.data.title_ne, lang)}
        subtitle={
          page.data.subtitle ? pickLang(page.data.subtitle, page.data.subtitle_ne, lang) : undefined
        }
      />
      {(isUntranslatedDoc(page.data.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(page.data.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}
    </div>
  );
}
