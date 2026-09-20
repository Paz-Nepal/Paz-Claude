import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSearchEverything } from "../api/use-wall";
import { DocumentHead } from "../components/document-head";
import { useLocalizedPath } from "../language";

const KIND_LABEL: Record<string, string> = {
  person: "Person",
  work: "Work",
  show: "Show",
  sattal: "The Sattal",
  word: "Words",
  record: "The Record",
  paper: "Papers",
  brief: "Brief",
  dispatch: "Dispatch",
  pigeon_post: "Pigeon Post",
  annual: "Annual",
  article: "Journal",
  page: "Page",
  event: "Event",
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = React.useState(q);
  const results = useSearchEverything(q);
  const localize = useLocalizedPath();

  React.useEffect(() => setDraft(q), [q]);

  return (
    <div className="w-standard py-16 pt-32">
      <DocumentHead title="Search" path="/search" noindex />
      <header className="flex flex-col gap-4">
        <h1 className="type-h1">Search</h1>
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
            aria-label="Search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </header>

      <div className="mt-10" aria-live="polite">
        {q && results.isPending && <p className="type-small">Searching…</p>}
        {q && results.isError && (
          <StatePanel title="Search failed." description={toAppError(results.error).message} />
        )}
        {q && results.data && results.data.length === 0 && (
          <p className="type-body">{`Nothing found for "${q}".`}</p>
        )}
        <ul className="flex flex-col gap-5">
          {(results.data ?? []).map((hit) => (
            <li key={`${hit.kind}:${hit.path}`}>
              <p className="type-caption">{KIND_LABEL[hit.kind] ?? hit.kind}</p>
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
