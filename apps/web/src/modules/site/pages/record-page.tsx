import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useRecordEntries } from "../api/use-site";

/**
 * The spine of the site (spec §2/§59): every public deposit, in order,
 * forever. Reads api.record_entries, which is a straight append-only
 * mirror of publishing.record_entries -- there is no filtering or
 * pagination cleverness here on purpose; it is the whole log.
 */
export function RecordPage() {
  const entries = useRecordEntries();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">The Record</h1>
        <p className="text-muted-foreground">
          The public deposit index. Every public thing PAZ makes is entered here, in order, and
          stays.
        </p>
      </header>

      {entries.isPending && <p className="text-muted-foreground">Loading…</p>}
      {entries.isError && (
        <StatePanel
          title="Couldn't load the Record."
          description={toAppError(entries.error).message}
        />
      )}

      {entries.data &&
        (entries.data.length === 0 ? (
          <StatePanel title="Nothing deposited yet." description="" />
        ) : (
          <ol className="flex flex-col gap-4">
            {entries.data.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 border-b pb-4 last:border-0">
                <span className="text-muted-foreground text-xs">
                  {entry.deposit_number}
                  {entry.deposited_at ? ` · ${formatKathmanduDate(entry.deposited_at)}` : ""}
                </span>
                {entry.link ? (
                  <Link to={entry.link} className="font-medium hover:underline">
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
