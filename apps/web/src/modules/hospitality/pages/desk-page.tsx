import { StatePanel, Badge, Button } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate, formatKathmanduTime } from "@paz/utils";
import {
  useDeskReservations,
  useSetReservationStatus,
  useTables,
  type ReservationStatus,
} from "../api/use-hospitality";

const STATUS_ACTIONS: Record<ReservationStatus, { to: ReservationStatus; label: string }[]> = {
  requested: [{ to: "confirmed", label: "Confirm" }],
  confirmed: [
    { to: "seated", label: "Seat" },
    { to: "cancelled", label: "Cancel" },
  ],
  seated: [{ to: "completed", label: "Complete" }],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function HospitalityDeskPage() {
  const reservations = useDeskReservations();
  const tables = useTables();
  const setStatus = useSetReservationStatus();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Reservations desk</h1>

      {reservations.isPending && <p className="text-muted-foreground">Loading…</p>}
      {reservations.isError && (
        <StatePanel
          title="Couldn't load reservations."
          description={toAppError(reservations.error).message}
        />
      )}

      {reservations.data &&
        (reservations.data.length === 0 ? (
          <StatePanel title="No reservations yet." description="" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Guest</th>
                  <th className="py-2 pr-4 font-medium">Party</th>
                  <th className="py-2 pr-4 font-medium">Table</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.data.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      {r.starts_at && (
                        <>
                          {formatKathmanduDate(r.starts_at)} · {formatKathmanduTime(r.starts_at)}
                        </>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{r.guest_name}</p>
                      <p className="text-muted-foreground text-xs">{r.code}</p>
                    </td>
                    <td className="py-3 pr-4">{r.party_size}</td>
                    <td className="py-3 pr-4">
                      {r.status === "requested" ? (
                        <select
                          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value || !r.id) return;
                            setStatus.mutate({
                              id: r.id,
                              status: "confirmed",
                              tableId: e.target.value,
                            });
                          }}
                        >
                          <option value="" disabled>
                            Assign table…
                          </option>
                          {(tables.data ?? []).map((t) => (
                            <option key={t.id} value={t.id ?? ""}>
                              {t.name} ({t.seats})
                            </option>
                          ))}
                        </select>
                      ) : (
                        (r.table_name ?? "—")
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={r.status === "cancelled" ? "outline" : "default"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {r.status &&
                          STATUS_ACTIONS[r.status]
                            .filter((a) => !(a.to === "confirmed")) // confirm happens via the table select above
                            .map((action) => (
                              <Button
                                key={action.to}
                                type="button"
                                size="sm"
                                variant="secondary"
                                loading={setStatus.isPending && setStatus.variables?.id === r.id}
                                onClick={() =>
                                  r.id &&
                                  setStatus.mutate({ id: r.id, status: action.to, tableId: null })
                                }
                              >
                                {action.label}
                              </Button>
                            ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {setStatus.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(setStatus.error).message}
        </p>
      )}
    </div>
  );
}
