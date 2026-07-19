import { useParams } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useBrief } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { DepositProvenance } from "../components/deposit-provenance";
import { NotPublished } from "../components/published-body";

export function BriefPage() {
  const { slug } = useParams<{ slug: string }>();
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
  if (!brief.data) return <NotPublished />;

  const item = brief.data;
  const body = pickLangDoc(item.body, item.body_ne, lang) as RichTextNode | null;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        {item.issue_no != null && (
          <p className="text-muted-foreground text-sm">
            Brief No. {item.issue_no}
            {item.issue_date ? ` · ${formatKathmanduDate(item.issue_date)}` : ""}
          </p>
        )}
        <h1 className="font-serif text-4xl">{pickLang(item.title ?? "", item.title_ne, lang)}</h1>
      </header>
      {body && <RichText doc={body} className="rich-text" />}
      <DepositProvenance depositRef={item.deposit_ref} />
    </article>
  );
}
