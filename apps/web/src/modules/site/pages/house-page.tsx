import { Link } from "react-router-dom";
import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import {
  useLanguage,
  pickLang,
  pickLangDoc,
  isUntranslatedDoc,
  useLocalizedPath,
} from "../language";
import { PageHero } from "../components/paz-editorial";
import { TranslationNotice } from "../components/translation-notice";
import { useWording, type WordingKey } from "../wording";

export function HousePage() {
  const page = usePublishedItem("page", "house");
  const { lang } = useLanguage();
  const w = useWording();
  const localize = useLocalizedPath();

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
        title={pickLang(data?.title ?? w("organ.house"), data?.title_ne, lang)}
        subtitle={data?.subtitle ? pickLang(data?.subtitle, data?.subtitle_ne, lang) : undefined}
      />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}

      <nav className="w-standard border-border border-t py-12" aria-label={w("house.in-label")}>
        <ul className="type-body flex flex-col gap-2">
          {(
            [
              ["/hearth", "house.hearth"],
              ["/guild", "house.guild"],
              ["/press", "house.press"],
              ["/record", "house.record"],
              ["/treasury", "house.treasury"],
              ["/chronicle", "house.chronicle"],
              ["/commons", "house.commons"],
              ["/friends", "house.friends"],
              ["/table", "house.table"],
              ["/encounters", "house.encounters"],
              ["/name", "house.name"],
              ["/canon", "house.canon"],
            ] as const satisfies ReadonlyArray<readonly [string, WordingKey]>
          ).map(([to, label]) => (
            <li key={to}>
              <Link to={localize(to)} className="link-underline">
                {w(label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
