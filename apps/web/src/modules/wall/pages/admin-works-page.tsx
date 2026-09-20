import * as React from "react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import {
  useAddWorkEvent,
  useAddWorkText,
  useAdminPeople,
  useAdminWorks,
  useSaveWork,
  useWorkParts,
  type AdminWork,
} from "../api/use-wall-admin";
import { ImageUploader } from "../components/image-uploader";
import {
  RecordForm,
  money,
  n,
  s,
  slugify,
  toValues,
  type FieldSpec,
  type Values,
} from "../components/record-form";

const AVAILABILITY = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "not_for_sale", label: "Not for sale" },
  { value: "on_loan", label: "On loan" },
];

const EVENT_KINDS = [
  "made",
  "shown",
  "sold",
  "loaned",
  "returned",
  "damaged",
  "restored",
  "rehoused",
].map((k) => ({ value: k, label: k[0]!.toUpperCase() + k.slice(1) }));

function workSpecs(people: Array<{ id: string | null; name: string | null }>): FieldSpec[] {
  return [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "title_ne", label: "Title in Nepali", type: "text" },
    { key: "slug", label: "Address", type: "text", required: true },
    {
      key: "person_id",
      label: "Maker",
      type: "select",
      required: true,
      options: people.map((p) => ({ value: p.id as string, label: p.name as string })),
    },
    { key: "year", label: "Year", type: "number" },
    { key: "medium", label: "Medium", type: "text" },
    { key: "medium_ne", label: "Medium in Nepali", type: "text" },
    { key: "height_cm", label: "Height (cm)", type: "number" },
    { key: "width_cm", label: "Width (cm)", type: "number" },
    { key: "depth_cm", label: "Depth (cm)", type: "number" },
    { key: "price", label: "Price (NPR)", type: "number", hint: "Shown once, plainly." },
    {
      key: "friends_price",
      label: "Friends of PAZ price (NPR)",
      type: "number",
      hint: "Shown as a second price, never as a saving.",
    },
    {
      key: "availability",
      label: "Availability",
      type: "select",
      required: true,
      options: AVAILABILITY,
    },
    {
      key: "first_showing",
      label: "First showing",
      type: "checkbox",
      hint: "Carried, never shown, never used to sort, filter or group the wall.",
    },
    {
      key: "hallmarked",
      label: "Carries the struck row",
      type: "checkbox",
      hint: "Only possible for a maker the Guild has formed.",
    },
    { key: "provenance_note", label: "Provenance note (factual)", type: "textarea", rows: 2 },
    { key: "image_licence", label: "Image licence (private)", type: "text" },
    {
      key: "may_show_after_sale",
      label: "The house may keep showing the images after a sale",
      type: "checkbox",
    },
    { key: "published", label: "Published", type: "checkbox" },
  ];
}

function initialFor(specs: FieldSpec[], w: AdminWork | null): Values {
  const base = toValues(specs, w);
  const cm = (mm: number | null | undefined) => (mm == null ? "" : String(mm / 10));
  const rupees = (minor: number | null | undefined) => (minor == null ? "" : String(minor / 100));
  return {
    ...base,
    height_cm: cm(w?.height_mm),
    width_cm: cm(w?.width_mm),
    depth_cm: cm(w?.depth_mm),
    price: rupees(w?.price_minor),
    friends_price: rupees(w?.friends_price_minor),
    availability: w?.availability ?? "available",
    may_show_after_sale: w ? Boolean(w.may_show_after_sale) : true,
  };
}

const mm = (v: string | boolean | undefined): number | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : Math.round(Number(t) * 10);
};

export function AdminWorksPage() {
  const works = useAdminWorks();
  const people = useAdminPeople();
  const save = useSaveWork();
  const [editing, setEditing] = React.useState<AdminWork | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const specs = React.useMemo(() => workSpecs(people.data ?? []), [people.data]);
  const showForm = isNew || editing != null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Works</h1>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsNew(true);
          }}
        >
          Add a work
        </Button>
      </div>

      {works.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {works.isError && (
        <StatePanel title="Couldn't load works." description={toAppError(works.error).message} />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <ul className="flex flex-col gap-2">
          {(works.data ?? []).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="hover:bg-muted w-full rounded-md border p-3 text-left"
                onClick={() => {
                  setIsNew(false);
                  setEditing(w);
                }}
              >
                <span className="font-medium">
                  No. {w.work_number}, {w.title}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {w.person_name} · {w.availability}
                  {!w.published ? " · draft" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {showForm && (
          <div className="flex flex-col gap-8">
            <RecordForm
              specs={specs}
              initial={initialFor(specs, editing)}
              resetKey={editing?.id ?? "new"}
              submitLabel={editing ? "Save" : "Add"}
              pending={save.isPending}
              error={save.error}
              onSubmit={(v) =>
                save.mutate(
                  {
                    p: {
                      id: editing?.id ?? null,
                      slug: s(v["slug"]) ?? slugify(String(v["title"])),
                      person_id: s(v["person_id"]),
                      title: s(v["title"]),
                      title_ne: s(v["title_ne"]),
                      year: n(v["year"]),
                      medium: s(v["medium"]),
                      medium_ne: s(v["medium_ne"]),
                      height_mm: mm(v["height_cm"]),
                      width_mm: mm(v["width_cm"]),
                      depth_mm: mm(v["depth_cm"]),
                      price_minor: money(v["price"]),
                      currency: "NPR",
                      friends_price_minor: money(v["friends_price"]),
                      availability: v["availability"],
                      first_showing: v["first_showing"],
                      hallmarked: v["hallmarked"],
                      provenance_note: s(v["provenance_note"]),
                      image_licence: s(v["image_licence"]),
                      may_show_after_sale: v["may_show_after_sale"],
                      published: v["published"],
                    },
                  },
                  { onSuccess: () => undefined },
                )
              }
            />
            {editing?.id && <WorkParts work={editing} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Images, the life of the work, and text about it. Everything here is
 * added, never edited or removed. */
function WorkParts({ work }: { work: AdminWork }) {
  const parts = useWorkParts(work.id ?? undefined);
  const addEvent = useAddWorkEvent();
  const addText = useAddWorkText();
  const eventSpecs: FieldSpec[] = [
    { key: "kind", label: "What happened", type: "select", required: true, options: EVENT_KINDS },
    { key: "occurred_on", label: "When", type: "date", required: true },
    { key: "note", label: "Note", type: "text" },
  ];
  const textSpecs: FieldSpec[] = [
    {
      key: "attribution",
      label: "Whose words",
      type: "select",
      required: true,
      options: [
        { value: "maker", label: "The maker's own words" },
        { value: "house", label: "The house speaking" },
      ],
      hint: "Text about a work must say who is speaking. Never an unattributed paragraph.",
    },
    { key: "body", label: "Text", type: "textarea", required: true },
    { key: "body_ne", label: "Text in Nepali", type: "textarea" },
  ];
  const have = new Set((parts.data?.images ?? []).map((i) => i.frame));

  return (
    <div className="flex flex-col gap-8 border-t pt-6">
      <section className="flex flex-col gap-3" aria-labelledby="adm-images">
        <h2 id="adm-images" className="font-medium">
          Images
        </h2>
        <p className="text-muted-foreground text-sm">
          Three frames: the whole work, a detail showing the surface, and one carrying scale.
          Present: {have.size === 0 ? "none" : [...have].join(", ")}.
        </p>
        {(["whole", "detail", "scale"] as const).map((frame) => (
          <ImageUploader
            key={frame}
            workId={work.id as string}
            workSlug={work.slug as string}
            frame={frame}
            label={`The ${frame === "whole" ? "whole work" : frame === "detail" ? "detail" : "scale reference"}`}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="adm-life">
        <h2 id="adm-life" className="font-medium">
          Its life
        </h2>
        <ol className="flex flex-col gap-1 text-sm">
          {(parts.data?.events ?? []).map((e) => (
            <li key={e.id}>
              {e.occurred_on ? formatKathmanduDate(e.occurred_on) : ""} · {e.kind}
              {e.note ? `. ${e.note}` : ""}
            </li>
          ))}
        </ol>
        <RecordForm
          specs={eventSpecs}
          initial={toValues(eventSpecs, null)}
          resetKey={`ev-${work.id}-${addEvent.submittedAt}`}
          submitLabel="Add to its life"
          pending={addEvent.isPending}
          error={addEvent.error}
          onSubmit={(v) =>
            addEvent.mutate({
              p_work: work.id,
              p_occurred_on: s(v["occurred_on"]),
              p_kind: s(v["kind"]),
              p_note: s(v["note"]),
            })
          }
        />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="adm-text">
        <h2 id="adm-text" className="font-medium">
          Text about this work
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {(parts.data?.texts ?? []).map((t) => (
            <li key={t.id}>
              <span className="font-medium">{t.attribution === "maker" ? "Maker" : "House"}:</span>{" "}
              {t.body}
            </li>
          ))}
        </ul>
        <RecordForm
          specs={textSpecs}
          initial={toValues(textSpecs, null)}
          resetKey={`tx-${work.id}-${addText.submittedAt}`}
          submitLabel="Add text"
          pending={addText.isPending}
          error={addText.error}
          onSubmit={(v) =>
            addText.mutate({
              p_work: work.id,
              p_attribution: s(v["attribution"]),
              p_body: s(v["body"]),
              p_body_ne: s(v["body_ne"]),
            })
          }
        />
      </section>
    </div>
  );
}
