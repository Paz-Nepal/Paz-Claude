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

export function HousePage() {
  const page = usePublishedItem("page", "house");
  const { lang } = useLanguage();
  const localize = useLocalizedPath();

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
        title={pickLang(data?.title ?? "The House", data?.title_ne, lang)}
        subtitle={data?.subtitle ? pickLang(data?.subtitle, data?.subtitle_ne, lang) : undefined}
      />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}

      <nav className="w-standard border-border border-t py-12" aria-label="In the house">
        <ul className="type-body flex flex-col gap-2">
          {[
            ["/hearth", "The Hearth"],
            ["/guild", "The Guild"],
            ["/press", "The Press"],
            ["/record", "The Record"],
            ["/treasury", "The Treasury"],
            ["/chronicle", "The Chronicle"],
            ["/commons", "The Commons"],
            ["/friends", "Friends of PAZ"],
            ["/table", "The Table"],
            ["/encounters", "Encounters"],
            ["/name", "The name"],
            ["/canon", "The Canon"],
          ].map(([to, label]) => (
            <li key={to}>
              <Link to={localize(to as string)} className="link-underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
