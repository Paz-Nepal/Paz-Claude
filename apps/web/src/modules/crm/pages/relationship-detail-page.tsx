import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, StatePanel, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import {
  useEndRelationship,
  useInteractions,
  useLogInteraction,
  useRelationships,
} from "../api/use-crm";

function LogInteractionForm({ relationshipId }: { relationshipId: string }) {
  const [summary, setSummary] = React.useState("");
  const log = useLogInteraction(relationshipId);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!summary.trim()) return;
        log.mutate(summary, { onSuccess: () => setSummary("") });
      }}
    >
      <Textarea
        placeholder="What happened? (call, meeting, email, gift acknowledgement, …)"
        rows={2}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      {log.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(log.error).message}
        </p>
      )}
      <Button type="submit" size="sm" loading={log.isPending} className="self-start">
        Log interaction
      </Button>
    </form>
  );
}

export function RelationshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const relationships = useRelationships();
  const interactions = useInteractions(id);
  const endRelationship = useEndRelationship();

  const relationship = relationships.data?.find((r) => r.id === id);

  if (relationships.isPending) return <p className="text-muted-foreground">Loading…</p>;
  if (!relationship) {
    return (
      <StatePanel
        title="Relationship not found."
        description="It may have ended and been archived."
      />
    );
  }

  return (
    <div className="max-w-standard flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Link to="/admin/relationships" className="text-muted-foreground text-sm hover:underline">
          ← Relationships
        </Link>
        <h1 className="font-serif text-2xl">{relationship.subject_name}</h1>
        <Badge variant={relationship.status === "active" ? "default" : "outline"}>
          {relationship.status}
        </Badge>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <p>
          <span className="text-muted-foreground">Kind</span> {relationship.kind}
        </p>
        {relationship.notes && (
          <p>
            <span className="text-muted-foreground">Notes</span> {relationship.notes}
          </p>
        )}
      </div>

      {relationship.status === "active" && id && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="self-start"
          loading={endRelationship.isPending}
          onClick={() => endRelationship.mutate(id)}
        >
          End relationship
        </Button>
      )}

      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium">Log an interaction</span>
        {id && <LogInteractionForm relationshipId={id} />}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">History</span>
        {interactions.data && interactions.data.length === 0 && (
          <p className="text-muted-foreground text-sm">Nothing logged yet.</p>
        )}
        <ul className="flex flex-col gap-3">
          {interactions.data?.map((interaction) => (
            <li key={interaction.id} className="border-b pb-3 last:border-0">
              <p className="text-sm">{interaction.summary}</p>
              <p className="text-muted-foreground text-xs">
                {interaction.created_by_name} ·{" "}
                {interaction.occurred_at ? formatKathmanduTime(interaction.occurred_at) : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
