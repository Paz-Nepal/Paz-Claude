import { useParams } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useDispatch } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { DepositProvenance } from "../components/deposit-provenance";
import { NotPublished } from "../components/published-body";

export function DispatchPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useDispatch(slug);
  const { lang } = useLanguage();

  if (dispatch.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (dispatch.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(dispatch.error).message} />
      </div>
    );
  }
  if (!dispatch.data) return <NotPublished />;

  const item = dispatch.data;
  const body = pickLangDoc(item.body, item.body_ne, lang) as RichTextNode | null;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        {item.issue_no != null && (
          <p className="text-muted-foreground text-sm">
            Dispatch No. {item.issue_no}
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
