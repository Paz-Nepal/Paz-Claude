import * as React from "react";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAddChronicleLine, useAdminChronicle } from "../api/use-wall-admin";

const MAX = 280;

/**
 * The easiest thing in the console: a date and one line of text. The
 * Chronicle is append-only; a correction is another line. It records the
 * house's acts, never the people they were done to (Build Specification 9).
 */
export function AdminChroniclePage() {
  const lines = useAdminChronicle();
  const add = useAddChronicleLine();
  const today = new Date().toISOString().slice(0, 10);
  const [on, setOn] = React.useState(today);
  const [line, setLine] = React.useState("");
  const [corrects, setCorrects] = React.useState<string | null>(null);

  const tooLong = line.length > MAX;
  const canSubmit = on && line.trim() && !tooLong;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">The Chronicle</h1>

      <ul className="text-muted-foreground list-disc pl-5 text-sm">
        <li>One line for each thing the house did. No titles, no bodies.</li>
        <li>
          Record the house&rsquo;s acts, never the people they were done to. A recording is
          chronicled by accession number alone: no giver&rsquo;s name, no family, no place of a
          sitting.
        </li>
        <li>A death is a line, never a post. No memorial page, image or card.</li>
        <li>Nothing is edited or deleted. A correction is another line.</li>
      </ul>

      <form
        className="flex max-w-2xl flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          add.mutate(
            { p_on: on, p_line: line.trim(), p_corrects: corrects },
            {
              onSuccess: () => {
                setLine("");
                setCorrects(null);
              },
            },
          );
        }}
      >
        <Field label="Date" htmlFor="chron-date">
          <Input id="chron-date" type="date" value={on} onChange={(e) => setOn(e.target.value)} />
        </Field>
        <Field
          label={corrects ? "Correcting an earlier line" : "The line"}
          htmlFor="chron-line"
          hint={`${line.length} of ${MAX} characters. One line.`}
          error={tooLong ? "Too long for one line." : undefined}
        >
          <Input
            id="chron-line"
            value={line}
            onChange={(e) => setLine(e.target.value.replace(/[\r\n]+/g, " "))}
          />
        </Field>
        {add.isError && (
          <p role="alert" aria-live="assertive" className="text-destructive text-sm">
            {toAppError(add.error).message}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={add.isPending} disabled={!canSubmit}>
            Add to the Chronicle
          </Button>
          {corrects && (
            <Button type="button" variant="ghost" onClick={() => setCorrects(null)}>
              Cancel the correction
            </Button>
          )}
        </div>
      </form>

      {lines.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {lines.isError && (
        <StatePanel
          title="Couldn't load the Chronicle."
          description={toAppError(lines.error).message}
        />
      )}
      <ol className="flex flex-col gap-2 text-sm">
        {(lines.data ?? []).map((l) => (
          <li key={l.id} className="flex items-baseline justify-between gap-4">
            <span>
              <span className="text-muted-foreground">{l.line_on}</span> {l.line}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCorrects(l.id);
                setOn(today);
              }}
            >
              Correct
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
