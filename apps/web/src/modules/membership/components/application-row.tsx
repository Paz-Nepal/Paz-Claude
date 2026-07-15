import * as React from "react";
import { Button, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useDecideApplication } from "../api/use-membership";

export function ApplicationRow({
  id,
  name,
  email,
  tierKey,
  motivation,
}: {
  id: string;
  name: string | null;
  email: string | null;
  tierKey: string | null;
  motivation: string | null;
}) {
  const [notes, setNotes] = React.useState("");
  const decide = useDecideApplication();

  return (
    <li className="flex flex-col gap-3 border-b py-4 last:border-0">
      <div>
        <p className="font-medium">
          {name} <span className="text-muted-foreground font-normal">· {email}</span>
        </p>
        <p className="text-muted-foreground text-sm">Applying for: {tierKey}</p>
        {motivation && <p className="mt-1 text-sm">{motivation}</p>}
      </div>
      <Textarea
        placeholder="Decision notes (optional, kept with the application record)"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {decide.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(decide.error).message}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          loading={decide.isPending && decide.variables?.decision === "accepted"}
          disabled={decide.isPending}
          onClick={() => decide.mutate({ id, decision: "accepted", notes: notes || null })}
        >
          Accept
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={decide.isPending && decide.variables?.decision === "declined"}
          disabled={decide.isPending}
          onClick={() => decide.mutate({ id, decision: "declined", notes: notes || null })}
        >
          Decline
        </Button>
      </div>
    </li>
  );
}
