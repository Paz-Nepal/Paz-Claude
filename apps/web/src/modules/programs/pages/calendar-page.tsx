import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { useProgramSessions } from "../api/use-programs";

export function CalendarPage() {
  const sessions = useProgramSessions();

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <h1 className="font-serif text-3xl">Programme calendar</h1>

      {sessions.isPending && <p className="text-muted-foreground">Loading…</p>}
      {sessions.isError && (
        <StatePanel
          title="Couldn't load the calendar."
          description={toAppError(sessions.error).message}
        />
      )}

      {sessions.data &&
        (sessions.data.length === 0 ? (
          <StatePanel title="Nothing scheduled yet." description="Check back soon." />
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.data.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/programmes/${session.program_slug}`}
                  className="hover:bg-muted flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{session.program_title}</p>
                    <p className="text-muted-foreground text-sm">
                      {session.starts_at ? formatKathmanduTime(session.starts_at) : ""}
                      {session.venue_name ? ` · ${session.venue_name}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
