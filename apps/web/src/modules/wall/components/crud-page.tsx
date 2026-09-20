import * as React from "react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { RecordForm, toValues, type FieldSpec, type Values } from "./record-form";

/**
 * A list on the left and a form on the right, for the many small registers
 * of the house (hands, encounters, treasury, guild). Each page supplies its
 * fields and how a row becomes a payload; nothing here knows about any one
 * register.
 */
export function CrudPage<Row extends { id: string | null }>({
  title,
  intro,
  addLabel,
  rows,
  status,
  specs,
  rowLabel,
  rowDetail,
  initial,
  toPayload,
  mutation,
  extra,
}: {
  title: string;
  intro?: string;
  addLabel: string;
  rows: Row[] | undefined;
  status: { isPending: boolean; isError: boolean; error: unknown };
  specs: FieldSpec[];
  rowLabel: (row: Row) => string;
  rowDetail?: (row: Row) => string;
  initial?: (row: Row | null, base: Values) => Values;
  toPayload: (values: Values, row: Row | null) => Record<string, unknown>;
  mutation: {
    mutate: (args: Record<string, unknown>, opts?: { onSuccess?: () => void }) => void;
    isPending: boolean;
    error: unknown;
  };
  extra?: (row: Row) => React.ReactNode;
}) {
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const show = isNew || editing != null;
  const base = toValues(specs, editing);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">{title}</h1>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsNew(true);
          }}
        >
          {addLabel}
        </Button>
      </div>
      {intro && <p className="text-muted-foreground text-sm">{intro}</p>}
      {status.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {status.isError && (
        <StatePanel title="Couldn't load this." description={toAppError(status.error).message} />
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <ul className="flex flex-col gap-2">
          {(rows ?? []).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="hover:bg-muted w-full rounded-md border p-3 text-left"
                onClick={() => {
                  setIsNew(false);
                  setEditing(r);
                }}
              >
                <span className="font-medium">{rowLabel(r)}</span>
                {rowDetail && (
                  <span className="text-muted-foreground block text-sm">{rowDetail(r)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {show && (
          <div className="flex flex-col gap-8">
            <RecordForm
              specs={specs}
              initial={initial ? initial(editing, base) : base}
              resetKey={editing?.id ?? "new"}
              submitLabel={editing ? "Save" : "Add"}
              pending={mutation.isPending}
              error={mutation.error}
              onSubmit={(v) =>
                mutation.mutate(toPayload(v, editing), {
                  onSuccess: () => {
                    setEditing(null);
                    setIsNew(false);
                  },
                })
              }
            />
            {editing && extra?.(editing)}
          </div>
        )}
      </div>
    </div>
  );
}
