import * as React from "react";
import { Button, Field, Input, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useFindPersonByEmail, useOrganizations, useSaveRelationship } from "../api/use-crm";

export function NewRelationshipForm() {
  const [subjectType, setSubjectType] = React.useState<"person" | "org">("org");
  const [orgId, setOrgId] = React.useState("");
  const [personEmail, setPersonEmail] = React.useState("");
  const [resolvedPerson, setResolvedPerson] = React.useState<{
    id: string;
    display_name: string | null;
  } | null>(null);
  const [kind, setKind] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const organizations = useOrganizations();
  const findPerson = useFindPersonByEmail();
  const save = useSaveRelationship();

  const lookupPerson = () => {
    if (!personEmail.trim()) return;
    findPerson.mutate(personEmail, { onSuccess: (person) => setResolvedPerson(person) });
  };

  const canSubmit = kind.trim() && (subjectType === "org" ? orgId : resolvedPerson);

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        save.mutate(
          {
            id: null,
            personId: subjectType === "person" ? (resolvedPerson?.id ?? null) : null,
            orgId: subjectType === "org" ? orgId : null,
            kind,
            ownerPerson: null,
            notes: notes || null,
          },
          {
            onSuccess: () => {
              setKind("");
              setNotes("");
              setOrgId("");
              setPersonEmail("");
              setResolvedPerson(null);
            },
          },
        );
      }}
    >
      <div className="flex gap-1" role="group" aria-label="Relationship subject type">
        <Button
          type="button"
          size="sm"
          variant={subjectType === "org" ? "primary" : "ghost"}
          onClick={() => setSubjectType("org")}
        >
          Organization
        </Button>
        <Button
          type="button"
          size="sm"
          variant={subjectType === "person" ? "primary" : "ghost"}
          onClick={() => setSubjectType("person")}
        >
          Person
        </Button>
      </div>

      {subjectType === "org" ? (
        <Field label="Organization" htmlFor="rel-org">
          <select
            id="rel-org"
            className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-base"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">Select…</option>
            {(organizations.data ?? []).map((org) => (
              <option key={org.id} value={org.id ?? ""}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field
          label="Person's email"
          htmlFor="rel-person-email"
          hint="Must already exist in the system (a member, applicant, or contact)."
        >
          <div className="flex gap-2">
            <Input
              id="rel-person-email"
              type="email"
              value={personEmail}
              onChange={(e) => {
                setPersonEmail(e.target.value);
                setResolvedPerson(null);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={findPerson.isPending}
              onClick={lookupPerson}
            >
              Find
            </Button>
          </div>
          {findPerson.isSuccess && !resolvedPerson && (
            <p className="text-destructive text-sm">No one found with that email.</p>
          )}
          {resolvedPerson && (
            <p className="text-sm">
              Found: <span className="font-medium">{resolvedPerson.display_name}</span>
            </p>
          )}
        </Field>
      )}

      <Field label="Kind" htmlFor="rel-kind" hint="e.g. donor, sponsor, partner, board member">
        <Input id="rel-kind" value={kind} onChange={(e) => setKind(e.target.value)} />
      </Field>
      <Field label="Notes" htmlFor="rel-notes">
        <Textarea
          id="rel-notes"
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
      <Button
        type="submit"
        size="sm"
        loading={save.isPending}
        disabled={!canSubmit}
        className="self-start"
      >
        Add relationship
      </Button>
    </form>
  );
}
