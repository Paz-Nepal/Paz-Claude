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
import { PageHero, Eyebrow, Reveal } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";
import { TranslationNotice } from "../components/translation-notice";

export function HousePage() {
  const page = usePublishedItem("page", "house");
  const visit = usePublishedItem("page", "visit");
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
  if (!page.data) return <NotPublished />;

  const body = pickLangDoc(page.data.body, page.data.body_ne, lang) as RichTextNode | null;
  const visitBody = visit.data
    ? (pickLangDoc(visit.data.body, visit.data.body_ne, lang) as RichTextNode | null)
    : null;

  return (
    <div>
      <PageHero
        kicker="An organ of the house"
        title={pickLang(page.data.title ?? "The House", page.data.title_ne, lang)}
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

      {visit.data && (
        <section className="border-border bg-secondary/40 border-t py-16 md:py-24">
          <div className="w-standard">
            <Reveal>
              <Eyebrow>Visiting</Eyebrow>
              <h2 className="type-h2">
                {pickLang(visit.data.title ?? "Visit", visit.data.title_ne, lang)}
              </h2>
            </Reveal>
            {(isUntranslatedDoc(visit.data?.body_ne, lang) || visitBody) && (
              <div className="mt-8">
                {isUntranslatedDoc(visit.data?.body_ne, lang) && <TranslationNotice />}
                {visitBody && <RichText doc={visitBody} className="rich-text" />}
              </div>
            )}
          </div>
        </section>
      )}
      <nav className="w-standard border-border border-t py-12" aria-label="In the house">
        <ul className="type-body flex flex-col gap-2">
          {[
            ["/hearth", "The Hearth"],
            ["/guild", "The Guild"],
            ["/press", "The Press"],
            ["/the-record", "The Record"],
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
