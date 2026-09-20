import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc, isUntranslatedDoc } from "../language";
import { PageHero } from "../components/paz-editorial";
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
  // An organ exists in law before it has written anything. No holding line
  // is invented in the meantime: the organ shows its own hub and no body.
  const data = page.data ?? null;

  const body = pickLangDoc(data?.body, data?.body_ne, lang) as RichTextNode | null;

  return (
    <div>
      <PageHero
        kicker="An organ of the house"
        title={pickLang(data?.title ?? "The Hearth", data?.title_ne, lang)}
        subtitle={data?.subtitle ? pickLang(data?.subtitle, data?.subtitle_ne, lang) : undefined}
      />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}
    </div>
  );
}
