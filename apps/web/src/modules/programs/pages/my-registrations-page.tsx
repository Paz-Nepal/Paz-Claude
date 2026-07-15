import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { useCancelMyRegistration, useMyRegistrations } from "../api/use-programs";

export function MyRegistrationsPage() {
  const registrations = useMyRegistrations();
  const cancel = useCancelMyRegistration();

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <h1 className="font-serif text-3xl">My registrations</h1>

      {registrations.isPending && <p className="text-muted-foreground">Loading…</p>}
      {registrations.isError && (
        <StatePanel
          title="Couldn't load your registrations."
          description={toAppError(registrations.error).message}
        />
      )}

      {registrations.data &&
        (registrations.data.length === 0 ? (
          <StatePanel
            title="Nothing here yet."
            description="Sessions you register for will show up here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {registrations.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{r.program_title}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.starts_at ? formatKathmanduTime(r.starts_at) : ""} · {r.status}
                  </p>
                </div>
                {r.status !== "cancelled" && r.id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={cancel.isPending && cancel.variables === r.id}
                    onClick={() => cancel.mutate(r.id as string)}
                  >
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
