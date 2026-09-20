import * as React from "react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAdminShows, useAdminWorks, useSaveShow, type AdminShow } from "../api/use-wall-admin";
import { RecordForm, s, slugify, toValues, type FieldSpec } from "../components/record-form";

const SPECS: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "title_ne", label: "Title in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  { key: "opened_on", label: "Opened", type: "date", required: true },
  { key: "closed_on", label: "Closed", type: "date" },
  {
    key: "text",
    label: "Text",
    type: "textarea",
    rows: 6,
    hint: "The house's own words. The page marks them as the house speaking.",
  },
  { key: "text_ne", label: "Text in Nepali", type: "textarea", rows: 6 },
  { key: "published", label: "Published", type: "checkbox" },
];

/**
 * A show page persists after closing. Works can be added to a show at any
 * time and are never removed: what hung is a record. The site never
 * advertises opening hours.
 */
export function AdminShowsPage() {
  const shows = useAdminShows();
  const works = useAdminWorks();
  const save = useSaveShow();
  const [editing, setEditing] = React.useState<AdminShow | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const showForm = isNew || editing != null;

  React.useEffect(() => {
    setPicked(new Set());
  }, [editing?.id, isNew]);

  const already = new Set(editing?.work_ids ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Shows</h1>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsNew(true);
          }}
        >
          Add a show
        </Button>
      </div>

      {shows.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {shows.isError && (
        <StatePanel title="Couldn't load shows." description={toAppError(shows.error).message} />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <ul className="flex flex-col gap-2">
          {(shows.data ?? []).map((sh) => (
            <li key={sh.id}>
              <button
                type="button"
                className="hover:bg-muted w-full rounded-md border p-3 text-left"
                onClick={() => {
                  setIsNew(false);
                  setEditing(sh);
                }}
              >
                <span className="font-medium">{sh.title}</span>
                <span className="text-muted-foreground block text-sm">
                  {sh.opened_on}
                  {sh.closed_on ? ` to ${sh.closed_on}` : ""}
                  {!sh.published ? " · draft" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {showForm && (
          <RecordForm
            specs={SPECS}
            initial={toValues(SPECS, editing)}
            resetKey={editing?.id ?? "new"}
            submitLabel={editing ? "Save" : "Add"}
            pending={save.isPending}
            error={save.error}
            onSubmit={(v) =>
              save.mutate({
                p: {
                  id: editing?.id ?? null,
                  slug: s(v["slug"]) ?? slugify(String(v["title"])),
                  title: s(v["title"]),
                  title_ne: s(v["title_ne"]),
                  opened_on: s(v["opened_on"]),
                  closed_on: s(v["closed_on"]),
                  text: s(v["text"]),
                  text_ne: s(v["text_ne"]),
                  published: v["published"],
                  work_ids: [...already, ...picked],
                },
              })
            }
          >
            <fieldset className="flex flex-col gap-2 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">What hung</legend>
              {(works.data ?? []).map((w) => {
                const id = w.id as string;
                const locked = already.has(id);
                return (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={locked || picked.has(id)}
                      disabled={locked}
                      onChange={(e) => {
                        const next = new Set(picked);
                        if (e.target.checked) next.add(id);
                        else next.delete(id);
                        setPicked(next);
                      }}
                    />
                    No. {w.work_number}, {w.title} ({w.person_name})
                    {locked ? " · already in the show" : ""}
                  </label>
                );
              })}
            </fieldset>
          </RecordForm>
        )}
      </div>
    </div>
  );
}
