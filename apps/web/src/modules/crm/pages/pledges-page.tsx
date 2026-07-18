import * as React from "react";
import { Badge, Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents, formatKathmanduDate } from "@paz/utils";
import {
  useAcknowledgePledge,
  useRecordPledgeReceipt,
  useRelationships,
  useSavePledge,
  usePledges,
  type Pledge,
} from "../api/use-crm";

function NewPledgeForm() {
  const relationships = useRelationships();
  const [relationshipId, setRelationshipId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const save = useSavePledge();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = Math.round(Number(amount) * 100);
        if (!relationshipId || !Number.isFinite(cents) || cents <= 0) return;
        save.mutate(
          { id: null, relationshipId, pledgedAmountCents: cents, notes: null, anonymous: false },
          {
            onSuccess: () => {
              setRelationshipId("");
              setAmount("");
            },
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Relationship" htmlFor="pledge-rel">
          <select
            id="pledge-rel"
            className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-base"
            value={relationshipId}
            onChange={(e) => setRelationshipId(e.target.value)}
          >
            <option value="">Select…</option>
            {(relationships.data ?? [])
              .filter((r) => r.status === "active")
              .map((r) => (
                <option key={r.id} value={r.id ?? ""}>
                  {r.subject_name} ({r.kind})
                </option>
              ))}
          </select>
        </Field>
        <Field label="Pledged amount" htmlFor="pledge-amount">
          <Input
            id="pledge-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button type="submit" size="sm" loading={save.isPending} className="self-start">
        Record pledge
      </Button>
    </form>
  );
}

function PledgeRow({ pledge }: { pledge: Pledge }) {
  const [amount, setAmount] = React.useState("");
  const recordReceipt = useRecordPledgeReceipt();
  const acknowledge = useAcknowledgePledge();

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{pledge.subject_name}</span>
        <span>
          {pledge.pledged_amount_cents != null ? formatCents(pledge.pledged_amount_cents) : ""}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        Pledged {pledge.pledged_on ? formatKathmanduDate(pledge.pledged_on) : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {pledge.received_amount_cents != null ? (
          <Badge variant="default">Received {formatCents(pledge.received_amount_cents)}</Badge>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const cents = Math.round(Number(amount) * 100);
              if (!pledge.id || !Number.isFinite(cents) || cents <= 0) return;
              recordReceipt.mutate({ id: pledge.id, amountCents: cents });
            }}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 w-28"
              placeholder="Amount"
            />
            <Button type="submit" size="sm" variant="secondary" loading={recordReceipt.isPending}>
              Record receipt
            </Button>
          </form>
        )}
        {pledge.received_amount_cents != null &&
          (pledge.acknowledged_at ? (
            <Badge variant="outline">Acknowledged</Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              loading={acknowledge.isPending}
              onClick={() => pledge.id && acknowledge.mutate(pledge.id)}
            >
              Mark acknowledged
            </Button>
          ))}
      </div>
    </li>
  );
}

export function PledgesPage() {
  const pledges = usePledges();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Pledges</h1>
      <NewPledgeForm />

      {pledges.isPending && <p className="text-muted-foreground">Loading…</p>}
      {pledges.isError && (
        <StatePanel
          title="Couldn't load pledges."
          description={toAppError(pledges.error).message}
        />
      )}
      {pledges.data &&
        (pledges.data.length === 0 ? (
          <StatePanel title="No pledges yet." description="Record the first one above." />
        ) : (
          <ul className="flex flex-col gap-2">
            {pledges.data.map((pledge) => (
              <PledgeRow key={pledge.id} pledge={pledge} />
            ))}
          </ul>
        ))}
    </div>
  );
}
