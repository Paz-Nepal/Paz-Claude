import { useParams } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePaper, publicMediaUrl } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { DepositProvenance } from "../components/deposit-provenance";
import { SupersededBanner } from "../components/superseded-banner";
import { NotPublished } from "../components/published-body";
import { DocumentHead } from "../components/document-head";

export function PaperPage() {
  const { slug } = useParams<{ slug: string }>();
  const paper = usePaper(slug);
  const { lang } = useLanguage();

  if (paper.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (paper.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(paper.error).message} />
      </div>
    );
  }
  if (!paper.data) return <NotPublished />;

  const item = paper.data;
  const body = pickLangDoc(item.body, item.body_ne, lang) as RichTextNode | null;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      <DocumentHead
        title={pickLang(item.title ?? "", item.title_ne, lang)}
        description={item.abstract || "A Paz Paper, kept in the Record."}
        path={`/papers/${item.slug}`}
        ogType="article"
        depositRef={item.deposit_ref}
        license={item.license}
        seriesName="Paz Papers"
      />
      <SupersededBanner basePath="/papers" slug={item.superseded_by_slug} />
      <header className="flex flex-col gap-2">
        {item.paper_no != null && (
          <p className="text-muted-foreground text-sm">Paz Paper No. {item.paper_no}</p>
        )}
        <h1 className="font-serif text-4xl">{pickLang(item.title ?? "", item.title_ne, lang)}</h1>
        {/* Byline is always the fixed institutional string, never the individual
            author (spec §2) -- and Papers are never dated on the page. */}
        <p className="text-muted-foreground text-sm">A Paz Paper</p>
      </header>
      {item.abstract && <p className="text-muted-foreground italic">{item.abstract}</p>}
      {item.pdf_path && (
        <a
          href={publicMediaUrl(item.pdf_path)}
          className="self-start rounded-lg border px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          Download the typeset PDF
        </a>
      )}
      {body && <RichText doc={body} className="rich-text" />}
      {item.sources_note && (
        <p className="text-muted-foreground text-sm">Sources: {item.sources_note}</p>
      )}
      <DepositProvenance depositRef={item.deposit_ref} license={item.license} />
    </article>
  );
}
