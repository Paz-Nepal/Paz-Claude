import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc, isUntranslatedDoc } from "../language";
import { PageHero } from "../components/paz-editorial";
import { TranslationNotice } from "../components/translation-notice";
import { useWording } from "../wording";

export function HearthPage() {
  const page = usePublishedItem("page", "hearth");
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

  return (
    <div>
      <PageHero
        kicker={w("organ.kicker")}
        title={pickLang(data?.title ?? w("organ.hearth"), data?.title_ne, lang)}
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
