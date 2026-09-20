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
import { DocumentHead } from "../components/document-head";
import { TranslationNotice } from "../components/translation-notice";

/**
 * The organ page for The Record, at /record. The deposit register itself
 * lives at /record/deposits (Build Programme 2.4), so this page does not
 * have to explain the difference between the organ and its index. Its
 * words are the house's: until they are published the page shows its
 * title and the register's address, and nothing is invented in between.
 */
export function RecordOrganPage() {
  const page = usePublishedItem("page", "record");
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

  const data = page.data ?? null;
  const body = data ? (pickLangDoc(data.body, data.body_ne, lang) as RichTextNode | null) : null;
  const title = pickLang(data?.title ?? "The Record", data?.title_ne, lang);
  const subtitle = data?.subtitle ? pickLang(data.subtitle, data.subtitle_ne, lang) : undefined;

  return (
    <div>
      <DocumentHead
        title={title}
        description={subtitle}
        path="/record"
        feedPath="/record/feed.xml"
      />
      <PageHero kicker="An organ of the house" title={title} subtitle={subtitle} />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}
      <nav className="w-standard border-border border-t py-12" aria-label="In the Record">
        <ul className="type-body flex flex-col gap-2">
          <li>
            <Link to={localize("/record/deposits")} className="link-underline">
              The deposit register
            </Link>
          </li>
          <li>
            <Link to={localize("/chronicle")} className="link-underline">
              The Chronicle
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
