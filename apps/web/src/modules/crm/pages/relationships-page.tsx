import { Link } from "react-router-dom";
import { Badge, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useRelationships } from "../api/use-crm";
import { NewRelationshipForm } from "../components/new-relationship-form";

export function RelationshipsPage() {
  const relationships = useRelationships();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Relationships</h1>
      <NewRelationshipForm />

      {relationships.isPending && <p className="text-muted-foreground">Loading…</p>}
      {relationships.isError && (
        <StatePanel
          title="Couldn't load relationships."
          description={toAppError(relationships.error).message}
        />
      )}
      {relationships.data &&
        (relationships.data.length === 0 ? (
          <StatePanel title="No relationships yet." description="Add the first one above." />
        ) : (
          <ul className="flex flex-col gap-2">
            {relationships.data.map((rel) => (
              <li key={rel.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Link
                    to={`/admin/relationships/${rel.id}`}
                    className="font-medium hover:underline"
                  >
                    {rel.subject_name}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {rel.kind} · since {rel.started_on ? formatKathmanduDate(rel.started_on) : ""}
                  </p>
                </div>
                <Badge variant={rel.status === "active" ? "default" : "outline"}>
                  {rel.status}
                </Badge>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
