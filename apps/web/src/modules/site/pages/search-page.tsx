import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSearchPublished } from "../api/use-site";
import { SearchResultCard } from "../components/search-result-card";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = React.useState(q);
  const results = useSearchPublished(q);

  React.useEffect(() => setDraft(q), [q]);

  return (
    <div className="max-w-wide mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl">Search</h1>
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
            aria-label="Search published content"
            placeholder="Search the Journal, Papers, Brief, and more…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </header>

      {!q && (
        <StatePanel
          title="Search PAZ."
          description="Find published writing across the Journal, Papers, Brief, Dispatch, Annual, and Pigeon Post."
        />
      )}
      {q && results.isPending && <p className="text-muted-foreground">Searching…</p>}
      {q && results.isError && (
        <StatePanel title="Search failed." description={toAppError(results.error).message} />
      )}
      {q &&
        results.data &&
        (results.data.length === 0 ? (
          <StatePanel
            title={`Nothing found for "${q}".`}
            description="Try a different word, or browse the Journal and Press sections directly."
          />
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {results.data.map((item) => (
              <SearchResultCard key={item.id} item={item} />
            ))}
          </div>
        ))}
    </div>
  );
}
