import * as React from "react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import {
  useAddPersonExhibition,
  useAddPersonWriting,
  useAdminPeople,
  useSavePerson,
  type AdminPerson,
} from "../api/use-wall-admin";
import {
  RecordForm,
  n,
  s,
  slugify,
  toValues,
  type FieldSpec,
  type Values,
} from "../components/record-form";

const SPECS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "name_ne", label: "Name in Nepali", type: "text" },
  {
    key: "slug",
    label: "Address",
    type: "text",
    required: true,
    hint: "Lower case, with hyphens.",
  },
  {
    key: "statement",
    label: "Statement",
    type: "textarea",
    rows: 6,
    hint: "The person's own words, never the house's.",
  },
  { key: "statement_ne", label: "Statement in Nepali", type: "textarea", rows: 6 },
  { key: "is_artist", label: "Artist", type: "checkbox" },
  { key: "is_author", label: "Author", type: "checkbox" },
  { key: "is_maker", label: "Maker", type: "checkbox" },
  {
    key: "represented",
    label: "The gallery represents this person",
    type: "checkbox",
    hint: "Separate from the next flag. Neither implies the other.",
  },
  {
    key: "formed_by_guild",
    label: "The Guild has formed this person",
    type: "checkbox",
    hint: "Work by a formed maker may carry the struck row.",
  },
  {
    key: "active",
    label: "Currently presented",
    type: "checkbox",
    hint: "Untick when a person leaves. Their page, works and shows all remain.",
  },
  { key: "published", label: "Published", type: "checkbox" },
  {
    key: "house_split_note",
    label: "Split with the house (private)",
    type: "textarea",
    rows: 2,
    hint: "Staff only. Whether the house publishes its split is undecided, so this is never shown.",
  },
];

function initialFor(p: AdminPerson | null): Values {
  const roles = p?.roles ?? ["artist"];
  return {
    ...toValues(SPECS, p),
    is_artist: roles.includes("artist"),
    is_author: roles.includes("author"),
    is_maker: roles.includes("maker"),
    active: p ? Boolean(p.active) : true,
  };
}

export function AdminPeoplePage() {
  const people = useAdminPeople();
  const save = useSavePerson();
  const [editing, setEditing] = React.useState<AdminPerson | null>(null);
  const [isNew, setIsNew] = React.useState(false);

  const showForm = isNew || editing != null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">People</h1>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsNew(true);
          }}
        >
          Add a person
        </Button>
      </div>

      {people.isPending && <p className="text-muted-foreground">Loading…</p>}
      {people.isError && (
        <StatePanel title="Couldn't load people." description={toAppError(people.error).message} />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <ul className="flex flex-col gap-2">
          {(people.data ?? []).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="hover:bg-muted w-full rounded-md border p-3 text-left"
                onClick={() => {
                  setIsNew(false);
                  setEditing(p);
                }}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground block text-sm">
                  {(p.roles ?? []).join(", ")}
                  {p.represented ? " · represented" : ""}
                  {p.formed_by_guild ? " · formed by the Guild" : ""}
                  {!p.active ? " · not currently presented" : ""}
                  {!p.published ? " · draft" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {showForm && (
          <div className="flex flex-col gap-8">
            <RecordForm
              specs={SPECS}
              initial={initialFor(editing)}
              resetKey={editing?.id ?? "new"}
              submitLabel={editing ? "Save" : "Add"}
              pending={save.isPending}
              error={save.error}
              onSubmit={(v) => {
                const roles = [
                  v["is_artist"] && "artist",
                  v["is_author"] && "author",
                  v["is_maker"] && "maker",
                ].filter(Boolean);
                save.mutate(
                  {
                    p: {
                      id: editing?.id ?? null,
                      slug: s(v["slug"]) ?? slugify(String(v["name"])),
                      name: s(v["name"]),
                      name_ne: s(v["name_ne"]),
                      statement: s(v["statement"]),
                      statement_ne: s(v["statement_ne"]),
                      roles,
                      represented: v["represented"],
                      formed_by_guild: v["formed_by_guild"],
                      active: v["active"],
                      published: v["published"],
                      house_split_note: s(v["house_split_note"]),
                    },
                  },
                  {
                    onSuccess: () => {
                      setEditing(null);
                      setIsNew(false);
                    },
                  },
                );
              }}
            />
            {editing?.id && <Elsewhere personId={editing.id} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Where a person has shown elsewhere, and what has been written about
 * them outside the house. Both are additions; nothing is removed. */
function Elsewhere({ personId }: { personId: string }) {
  const addShow = useAddPersonExhibition();
  const addWriting = useAddPersonWriting();
  const showSpecs: FieldSpec[] = [
    { key: "title", label: "Show", type: "text", required: true },
    { key: "place", label: "Place", type: "text" },
    { key: "year", label: "Year", type: "number" },
    { key: "note", label: "Note", type: "text" },
  ];
  const writingSpecs: FieldSpec[] = [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "source", label: "Where it appeared", type: "text", required: true },
    { key: "year", label: "Year", type: "number" },
    { key: "url", label: "Link", type: "text" },
  ];
  return (
    <div className="flex flex-col gap-8 border-t pt-6">
      <section className="flex flex-col gap-3" aria-labelledby="adm-elsewhere">
        <h2 id="adm-elsewhere" className="font-medium">
          Shown elsewhere
        </h2>
        <RecordForm
          specs={showSpecs}
          initial={toValues(showSpecs, null)}
          resetKey={`ex-${personId}-${addShow.submittedAt}`}
          submitLabel="Add"
          pending={addShow.isPending}
          error={addShow.error}
          onSubmit={(v) =>
            addShow.mutate({
              p_person: personId,
              p_year: n(v["year"]),
              p_title: s(v["title"]),
              p_place: s(v["place"]),
              p_note: s(v["note"]),
            })
          }
        />
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="adm-writing">
        <h2 id="adm-writing" className="font-medium">
          Written about them elsewhere
        </h2>
        <RecordForm
          specs={writingSpecs}
          initial={toValues(writingSpecs, null)}
          resetKey={`wr-${personId}-${addWriting.submittedAt}`}
          submitLabel="Add"
          pending={addWriting.isPending}
          error={addWriting.error}
          onSubmit={(v) =>
            addWriting.mutate({
              p_person: personId,
              p_year: n(v["year"]),
              p_title: s(v["title"]),
              p_source: s(v["source"]),
              p_url: s(v["url"]),
            })
          }
        />
      </section>
    </div>
  );
}
