import * as React from "react";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useTables, useSaveTable } from "../api/use-hospitality";

export function TablesPage() {
  const tables = useTables();
  const save = useSaveTable();

  const [name, setName] = React.useState("");
  const [seats, setSeats] = React.useState("2");
  const [zone, setZone] = React.useState("");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Tables</h1>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !seats) return;
          save.mutate(
            { id: null, name, seats: Number(seats), zone: zone || null, active: true },
            {
              onSuccess: () => {
                setName("");
                setSeats("2");
                setZone("");
              },
            },
          );
        }}
      >
        <Field label="Name" htmlFor="table-name">
          <Input id="table-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Seats" htmlFor="table-seats">
          <Input
            id="table-seats"
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </Field>
        <Field label="Zone" htmlFor="table-zone" hint="Optional">
          <Input id="table-zone" value={zone} onChange={(e) => setZone(e.target.value)} />
        </Field>
        <Button type="submit" size="sm" loading={save.isPending}>
          Add table
        </Button>
      </form>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}

      {tables.data &&
        (tables.data.length === 0 ? (
          <StatePanel title="No tables yet." description="Add the first one above." />
        ) : (
          <ul className="flex flex-col gap-2">
            {tables.data.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    {t.name}
                    {t.zone && (
                      <span className="text-muted-foreground font-normal"> · {t.zone}</span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">{t.seats} seats</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={save.isPending}
                  onClick={() =>
                    t.id &&
                    save.mutate({
                      id: t.id,
                      name: t.name ?? "",
                      seats: t.seats ?? 1,
                      zone: t.zone,
                      active: !t.active,
                    })
                  }
                >
                  {t.active ? "Deactivate" : "Activate"}
                </Button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
