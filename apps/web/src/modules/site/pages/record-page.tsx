import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatDualEraDate } from "@paz/utils";
import { useRecordEntries } from "../api/use-site";
import { useLocalizedPath } from "../language";
import { useEmptyState } from "../empty-states";
import { useWording } from "../wording";

/**
 * The spine of the site (spec §2/§59): every public deposit, in order,
 * forever. Reads api.record_entries, which is a straight append-only
 * mirror of publishing.record_entries -- there is no filtering or
 * pagination *UI* here on purpose; it is the whole log, one scroll, no
 * "Load more." useRecordEntries (use-site.ts) pages past Supabase's
 * 1000-row-per-request cap internally so that stays true past deposit
 * one thousand too -- see its own comment for the audit finding this
 * closes.
 */
export function RecordPage() {
  const entries = useRecordEntries();
  const localize = useLocalizedPath();
  const w = useWording();
  const empty = useEmptyState();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("record.register-title")}</h1>
        <p className="text-muted-foreground">{w("record.register-intro")}</p>
      </header>

      {entries.isPending && (
        <p role="status" className="text-muted-foreground">
          {w("common.loading")}
        </p>
      )}
      {entries.isError && (
        <StatePanel
          title={w("record.load-error")}
          description={toAppError(entries.error).message}
        />
      )}

      {entries.data &&
        (entries.data.length === 0 ? (
          <p className="type-body">{empty("deposits")}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {entries.data.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 border-b pb-4 last:border-0">
                {/* Standing Specifications, "Calendar and numerals":
                    "Both eras always appear in the Record's deposit
                    entries... currently carrying one." */}
                <span className="text-muted-foreground text-xs">
                  {entry.deposit_number}
                  {entry.deposited_at ? ` · ${formatDualEraDate(entry.deposited_at)}` : ""}
                </span>
                {entry.link ? (
                  <Link to={localize(entry.link)} className="font-medium hover:underline">
                    {entry.title}
                  </Link>
                ) : (
                  <span className="font-medium">{entry.title}</span>
                )}
                <span className="text-muted-foreground text-sm">{entry.provenance}</span>
              </li>
            ))}
          </ol>
        ))}
    </div>
  );
}
