import { Link } from "react-router-dom";
import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { usePublishedItem, useRecordEntries } from "../api/use-site";
import {
  useLanguage,
  pickLang,
  pickLangDoc,
  useLocalizedPath,
  isUntranslatedDoc,
} from "../language";
import { PageHero, Eyebrow, Reveal } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";
import { DocumentHead } from "../components/document-head";
import { TranslationNotice } from "../components/translation-notice";

/**
 * The organ page for "The Record" — institutional description of what
 * this organ is, with the actual public deposit index (the same append-
 * only log /record shows) embedded beneath it, per the house's request
 * that the deposit index live under this page rather than stand alone in
 * top-level nav. /record itself still exists and still works as a direct
 * link (e.g. from Record entries elsewhere) — this just makes the organ
 * page the primary way a reader finds it.
 */
export function RecordOrganPage() {
  const page = usePublishedItem("page", "the-record");
  const entries = useRecordEntries();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();

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

  const title = pickLang(page.data.title ?? "The Record", page.data.title_ne, lang);
  const subtitle = page.data.subtitle
    ? pickLang(page.data.subtitle, page.data.subtitle_ne, lang)
    : undefined;

  return (
    <div>
      <DocumentHead
        title={title}
        description={subtitle || "The public deposit index — kept, in order, forever."}
        path="/the-record"
        feedPath="/the-record/feed.xml"
      />
      <PageHero kicker="An organ of the house" title={title} subtitle={subtitle} />
      {(isUntranslatedDoc(page.data.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(page.data.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}

      <section className="border-border border-t py-16 md:py-24">
        <div className="w-standard">
          <Reveal>
            <Eyebrow>Append-only, in order</Eyebrow>
            <h2 className="type-h2">The deposit index</h2>
            <p className="type-body mt-4">
              Every public thing PAZ makes is entered here, in order, and stays.
            </p>
          </Reveal>

          {entries.isPending && <p className="type-small mt-8">Loading…</p>}
          {entries.isError && (
            <StatePanel
              title="Couldn't load the Record."
              description={toAppError(entries.error).message}
              className="mt-8"
            />
          )}
          {entries.data &&
            (entries.data.length === 0 ? (
              <StatePanel title="Nothing deposited yet." description="" className="mt-8" />
            ) : (
              <ol className="mt-10 flex flex-col gap-4">
                {entries.data.map((entry) => (
                  <li key={entry.id} className="border-border flex flex-col gap-0.5 border-t pt-4">
                    <span className="type-caption">
                      {entry.deposit_number}
                      {entry.deposited_at ? ` · ${formatKathmanduDate(entry.deposited_at)}` : ""}
                    </span>
                    {entry.link ? (
                      <Link to={localize(entry.link)} className="link-underline font-serif text-lg">
                        {entry.title}
                      </Link>
                    ) : (
                      <span className="font-serif text-lg">{entry.title}</span>
                    )}
                    <span className="type-small">{entry.provenance}</span>
                  </li>
                ))}
              </ol>
            ))}
        </div>
      </section>
    </div>
  );
}
