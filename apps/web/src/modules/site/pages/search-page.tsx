import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSearchEverything } from "../api/use-wall";
import { DocumentHead } from "../components/document-head";
import { useLocalizedPath } from "../language";
import { useWording, type WordingKey } from "../wording";

const KIND_LABEL: Record<string, WordingKey> = {
  person: "kind.person",
  work: "kind.work",
  show: "kind.show",
  sattal: "kind.sattal",
  word: "kind.word",
  record: "kind.record",
  paper: "kind.paper",
  brief: "kind.brief",
  dispatch: "kind.dispatch",
  pigeon_post: "kind.pigeon-post",
  annual: "kind.annual",
  article: "kind.article",
  page: "kind.page",
  event: "kind.event",
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = React.useState(q);
  const results = useSearchEverything(q);
  const localize = useLocalizedPath();
  const w = useWording();

  React.useEffect(() => setDraft(q), [q]);

  return (
    <div className="w-standard py-16 pt-32">
      <DocumentHead title={w("search.title")} path="/search" noindex />
      <header className="flex flex-col gap-4">
        <h1 className="type-h1">{w("search.title")}</h1>
        <form
          role="search"
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchParams(draft.trim() ? { q: draft.trim() } : {});
          }}
        >
          <Input
            type="search"
            aria-label={w("search.box")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit">{w("search.button")}</Button>
        </form>
      </header>

      <div className="mt-10" aria-live="polite">
        {q && results.isPending && (
          <p role="status" className="type-small">
            {w("search.searching")}
          </p>
        )}
        {q && results.isError && (
          <StatePanel title={w("search.failed")} description={toAppError(results.error).message} />
        )}
        {q && results.data && results.data.length === 0 && (
          <p className="type-body">{w("search.nothing", { q })}</p>
        )}
        <ul className="flex flex-col gap-5">
          {(results.data ?? []).map((hit) => (
            <li key={`${hit.kind}:${hit.path}`}>
              <p className="type-caption">
                {KIND_LABEL[hit.kind] ? w(KIND_LABEL[hit.kind] as WordingKey) : hit.kind}
              </p>
              <Link to={localize(hit.path)} className="link-underline font-serif text-xl">
                {hit.title}
              </Link>
              {hit.detail && <p className="type-small">{hit.detail}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
