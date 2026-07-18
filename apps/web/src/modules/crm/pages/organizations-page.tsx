import * as React from "react";
import { Button, Field, Input, StatePanel, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useOrganizations, useSaveOrganization } from "../api/use-crm";

function NewOrganizationForm() {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const save = useSaveOrganization();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        save.mutate(
          { id: null, name, kind: kind || null, notes: notes || null },
          {
            onSuccess: () => {
              setName("");
              setKind("");
              setNotes("");
            },
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="org-name">
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Kind" htmlFor="org-kind" hint="e.g. foundation, company, embassy">
          <Input id="org-kind" value={kind} onChange={(e) => setKind(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="org-notes">
        <Textarea
          id="org-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button type="submit" size="sm" loading={save.isPending} className="self-start">
        Add organization
      </Button>
    </form>
  );
}

export function OrganizationsPage() {
  const organizations = useOrganizations();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Organizations</h1>
      <NewOrganizationForm />

      {organizations.isPending && <p className="text-muted-foreground">Loading…</p>}
      {organizations.isError && (
        <StatePanel
          title="Couldn't load organizations."
          description={toAppError(organizations.error).message}
        />
      )}
      {organizations.data &&
        (organizations.data.length === 0 ? (
          <StatePanel title="No organizations yet." description="Add the first one above." />
        ) : (
          <ul className="flex flex-col gap-2">
            {organizations.data.map((org) => (
              <li key={org.id} className="rounded-lg border p-3">
                <p className="font-medium">
                  {org.name}
                  {org.kind && (
                    <span className="text-muted-foreground font-normal"> · {org.kind}</span>
                  )}
                </p>
                {org.notes && <p className="text-muted-foreground text-sm">{org.notes}</p>}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
