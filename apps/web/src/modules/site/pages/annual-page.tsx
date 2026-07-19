import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAnnual, publicMediaUrl } from "../api/use-site";
import { useLanguage, pickLang } from "../language";
import { DepositProvenance } from "../components/deposit-provenance";
import { NotPublished } from "../components/published-body";

export function AnnualPage() {
  const { slug } = useParams<{ slug: string }>();
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
  if (!annual.data) return <NotPublished />;

  const item = annual.data;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
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
      <DepositProvenance depositRef={item.deposit_ref} />
    </article>
  );
}
