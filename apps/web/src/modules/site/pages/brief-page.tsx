import { Navigate, useParams } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useBrief } from "../api/use-site";
import {
  useLanguage,
  pickLang,
  pickLangDoc,
  isUntranslatedDoc,
  useLocalizedPath,
} from "../language";
import { DepositProvenance } from "../components/deposit-provenance";
import { SupersededBanner } from "../components/superseded-banner";
import { ResolveNotFoundPage } from "./resolve-not-found-page";
import { SpeakerNote } from "../components/wall-parts";
import { DocumentHead } from "../components/document-head";
import { TranslationNotice } from "../components/translation-notice";

export function BriefPage({ slug: slugProp }: { slug?: string } = {}) {
  const params = useParams<{ slug: string; deposit: string }>();
  const slug = slugProp ?? params.slug;
  const localize = useLocalizedPath();
  const brief = useBrief(slug);
  const { lang } = useLanguage();

  if (brief.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (brief.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(brief.error).message} />
      </div>
    );
  }
  if (!brief.data) return <ResolveNotFoundPage />;
  // The deposit number is the canonical address; the readable slug
  // redirects to it, never the reverse (Build Specification 4.10).
  if (!params.deposit && brief.data.deposit_ref) {
    return <Navigate to={localize(`/record/${brief.data.deposit_ref}`)} replace />;
  }

  const item = brief.data;
  const body = pickLangDoc(item.body, item.body_ne, lang) as RichTextNode | null;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      <SpeakerNote speaker="house" />
      <DocumentHead
        title={pickLang(item.title ?? "", item.title_ne, lang)}
        description={
          item.issue_no != null ? `Brief No. ${item.issue_no}, kept in the Record.` : "A Brief."
        }
        path={`/brief/${item.slug}`}
        ogType="article"
        depositRef={item.deposit_ref}
        seriesName="Brief"
      />
      <SupersededBanner basePath="/brief" slug={item.superseded_by_slug} />
      <header className="flex flex-col gap-2">
        {item.issue_no != null && (
          <p className="text-muted-foreground text-sm">
            Brief No. {item.issue_no}
            {item.issue_date ? ` · ${formatKathmanduDate(item.issue_date)}` : ""}
          </p>
        )}
        <h1 className="font-serif text-4xl">{pickLang(item.title ?? "", item.title_ne, lang)}</h1>
      </header>
      {isUntranslatedDoc(item.body_ne, lang) && <TranslationNotice />}
      {body && <RichText doc={body} className="rich-text" />}
      <DepositProvenance
        series="The Brief"
        title={item.title ?? ""}
        depositRef={item.deposit_ref}
      />
    </article>
  );
}
