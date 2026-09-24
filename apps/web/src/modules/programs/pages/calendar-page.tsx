import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { useWording } from "@/modules/site/wording";
import { useProgramSessions } from "../api/use-programs";

export function CalendarPage() {
  const sessions = useProgramSessions();
  const w = useWording();

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <h1 className="font-serif text-3xl">{w("programmes.title")}</h1>

      {/* Encounters — the public civic layer (Field Studies, Common Ground,
          The Chautari) lives here rather than its own nav entry, per the
          house's request. /encounters itself is unchanged. */}
      <Link
        to="/encounters"
        className="hover:bg-muted flex items-center justify-between rounded-lg border p-4"
      >
        <div>
          <p className="font-medium">{w("programmes.encounters")}</p>
          <p className="text-muted-foreground text-sm">{w("programmes.encounters-note")}</p>
        </div>
        <span className="text-muted-foreground text-sm">→</span>
      </Link>

      {sessions.isPending && (
        <p role="status" className="text-muted-foreground">
          {w("common.loading")}
        </p>
      )}
      {sessions.isError && (
        <StatePanel
          title={w("programmes.load-error")}
          description={toAppError(sessions.error).message}
        />
      )}

      {sessions.data &&
        (sessions.data.length === 0 ? (
          <StatePanel title={w("programmes.empty")} description={w("programmes.empty-note")} />
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
