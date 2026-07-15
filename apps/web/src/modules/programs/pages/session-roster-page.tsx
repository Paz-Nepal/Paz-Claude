import { Link, useParams } from "react-router-dom";
import { Badge, Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { useMarkAttendance, useSessionRoster } from "../api/use-programs";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  registered: "default",
  waitlisted: "secondary",
  attended: "default",
  no_show: "outline",
  cancelled: "outline",
};

export function SessionRosterPage() {
  const { id } = useParams<{ id: string }>();
  const roster = useSessionRoster(id);
  const markAttendance = useMarkAttendance(id);

  return (
    <div className="max-w-standard flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/programmes" className="text-muted-foreground text-sm hover:underline">
          ← Programmes
        </Link>
        <h1 className="font-serif text-2xl">Roster</h1>
      </div>

      {roster.isPending && <p className="text-muted-foreground">Loading…</p>}
      {roster.isError && (
        <StatePanel
          title="Couldn't load the roster."
          description={toAppError(roster.error).message}
        />
      )}

      {roster.data &&
        (roster.data.length === 0 ? (
          <StatePanel
            title="No one has registered yet."
            description="Check back closer to the date."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.data.map((entry) => (
              <li
                key={entry.registration_id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{entry.person_name}</p>
                  <p className="text-muted-foreground text-sm">{entry.person_email}</p>
                  {entry.registered_at && (
                    <p className="text-muted-foreground text-xs">
                      Registered {formatKathmanduTime(entry.registered_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.status && (
                    <Badge variant={STATUS_VARIANT[entry.status] ?? "outline"}>
                      {entry.status}
                    </Badge>
                  )}
                  {(entry.status === "registered" || entry.status === "no_show") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={
                        markAttendance.isPending &&
                        markAttendance.variables?.registrationId === entry.registration_id
                      }
                      onClick={() =>
                        entry.registration_id &&
                        markAttendance.mutate({
                          registrationId: entry.registration_id,
                          attended: true,
                        })
                      }
                    >
                      Mark attended
                    </Button>
                  )}
                  {entry.status === "attended" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      loading={
                        markAttendance.isPending &&
                        markAttendance.variables?.registrationId === entry.registration_id
                      }
                      onClick={() =>
                        entry.registration_id &&
                        markAttendance.mutate({
                          registrationId: entry.registration_id,
                          attended: false,
                        })
                      }
                    >
                      Undo
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}
      {markAttendance.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(markAttendance.error).message}
        </p>
      )}
    </div>
  );
}
