import { Navigate, useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAnnual, publicMediaUrl } from "../api/use-site";
import { useLanguage, pickLang, useLocalizedPath } from "../language";
import { DepositProvenance } from "../components/deposit-provenance";
import { SupersededBanner } from "../components/superseded-banner";
import { ResolveNotFoundPage } from "./resolve-not-found-page";
import { SpeakerNote } from "../components/wall-parts";
import { DocumentHead } from "../components/document-head";

export function AnnualPage({ slug: slugProp }: { slug?: string } = {}) {
  const params = useParams<{ slug: string; deposit: string }>();
  const slug = slugProp ?? params.slug;
  const localize = useLocalizedPath();
  const annual = useAnnual(slug);
  const { lang } = useLanguage();

  if (annual.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (annual.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(annual.error).message} />
      </div>
    );
  }
  if (!annual.data) return <ResolveNotFoundPage />;
  // The deposit number is the canonical address; the readable slug
  // redirects to it, never the reverse (Build Specification 4.10).
  if (!params.deposit && annual.data.deposit_ref) {
    return <Navigate to={localize(`/record/${annual.data.deposit_ref}`)} replace />;
  }

  const item = annual.data;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      <SpeakerNote speaker="house" />
      <DocumentHead
        title={pickLang(item.title ?? "", item.title_ne, lang)}
        description={
          item.contents?.slice(0, 200) ||
          (item.year != null ? `The Annual, ${item.year}, kept in the Record.` : "The Annual.")
        }
        path={`/annual/${item.slug}`}
        ogType="article"
        depositRef={item.deposit_ref}
        seriesName="Annual"
      />
      <SupersededBanner basePath="/annual" slug={item.superseded_by_slug} />
      <header className="flex flex-col gap-2">
        {item.year != null && <p className="text-muted-foreground text-sm">{item.year}</p>}
        <h1 className="font-serif text-4xl">{pickLang(item.title ?? "", item.title_ne, lang)}</h1>
      </header>
      {item.contents && <p className="whitespace-pre-line">{item.contents}</p>}
      {item.pdf_path && (
        <a
          href={publicMediaUrl(item.pdf_path)}
          className="self-start rounded-lg border px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          Download the PDF
        </a>
      )}
      <DepositProvenance
        series="The Annual"
        title={item.title ?? ""}
        depositRef={item.deposit_ref}
      />
    </article>
  );
}
