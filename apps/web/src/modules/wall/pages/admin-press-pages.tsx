import * as React from "react";
import { Button } from "@paz/ui";
import { formatKathmanduDate, formatMoney } from "@paz/utils";
import { usePublishedItems } from "@/modules/site";
import {
  useAdminObjects,
  useAdminPigeonDistribution,
  useAdminPlaceVisits,
  useAdminPlaces,
  useRemovePigeonDistribution,
  useSaveObject,
  useSavePigeonDistribution,
  useSavePlace,
  useSavePlaceVisit,
  type AdminObject,
  type AdminPigeonDistribution,
  type AdminPlace,
} from "../api/use-house-admin";
import { useAdminEncounters } from "../api/use-wall-admin";
import { CrudPage } from "../components/crud-page";
import { PhotoUploader } from "../components/photo-uploader";
import {
  RecordForm,
  money,
  n,
  s,
  slugify,
  toValues,
  type FieldSpec,
} from "../components/record-form";

// ---------------------------------------------------------------------
// Where the pigeons went: copies and countries, never a name
// ---------------------------------------------------------------------
export function AdminPigeonReachPage() {
  const rows = useAdminPigeonDistribution();
  const editions = usePublishedItems("pigeon_post");
  const save = useSavePigeonDistribution();
  const remove = useRemovePigeonDistribution();
  const specs: FieldSpec[] = React.useMemo(
    () => [
      {
        key: "item_id",
        label: "Edition",
        type: "select",
        required: true,
        options: (editions.data ?? []).map((e) => ({ value: e.id ?? "", label: e.title ?? "" })),
      },
      { key: "country", label: "Country", type: "text", required: true },
      { key: "copies", label: "Copies", type: "number", required: true },
      { key: "noted_on", label: "Noted on", type: "date", hint: "Today if left empty." },
    ],
    [editions.data],
  );
  return (
    <CrudPage<AdminPigeonDistribution>
      title="Where the pigeons went"
      intro="A count of Pigeon Post copies by country. Never who received one: there is no place to write a name or an address."
      addLabel="Add a count"
      rows={rows.data}
      status={rows}
      specs={specs}
      rowLabel={(r) => `${r.item_title ?? ""}: ${r.country ?? ""}`}
      rowDetail={(r) => `${r.copies} copies · ${r.noted_on ? formatKathmanduDate(r.noted_on) : ""}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          item_id: s(v["item_id"]),
          country: s(v["country"]),
          copies: n(v["copies"]),
          noted_on: s(v["noted_on"]),
        },
      })}
      mutation={save}
      extra={(r) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start"
          loading={remove.isPending}
          onClick={() => remove.mutate({ p_id: r.id })}
        >
          Remove this count
        </Button>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// What the house sells as objects
// ---------------------------------------------------------------------
const OBJECT_SPECS: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "title_ne", label: "Title in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: [
      { value: "paper", label: "A Paper, printed" },
      { value: "pigeon_post", label: "A Pigeon Post, printed" },
      { value: "print", label: "A print" },
      { value: "other", label: "Something else" },
    ],
  },
  { key: "description", label: "What it is", type: "textarea", rows: 3 },
  { key: "description_ne", label: "What it is, in Nepali", type: "textarea", rows: 3 },
  {
    key: "price",
    label: "Price, in rupees",
    type: "number",
    hint: "Leave empty to show no price. VAT registration of PAZ Modern is not yet settled.",
  },
  { key: "sort", label: "Order", type: "number" },
  { key: "published", label: "Published", type: "checkbox" },
];

export function AdminObjectsPage() {
  const rows = useAdminObjects();
  const save = useSaveObject();
  return (
    <CrudPage<AdminObject>
      title="What the house sells"
      intro="The Papers and the Pigeon Post as printed objects, and prints. There is no checkout: each object carries an enquiry that reaches the desk, and a sale stays a conversation."
      addLabel="Add an object"
      rows={rows.data}
      status={rows}
      specs={OBJECT_SPECS}
      initial={(row, base) =>
        row
          ? { ...base, price: row.price_minor != null ? String(row.price_minor / 100) : "" }
          : { ...base, kind: "print" }
      }
      rowLabel={(r) => r.title ?? ""}
      rowDetail={(r) =>
        `${r.price_minor != null ? formatMoney(r.price_minor) : "no price shown"}${r.published ? "" : " · draft"}`
      }
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          slug: s(v["slug"]) ?? slugify(String(v["title"])),
          kind: v["kind"],
          title: s(v["title"]),
          title_ne: s(v["title_ne"]),
          description: s(v["description"]),
          description_ne: s(v["description_ne"]),
          price_minor: money(v["price"]),
          sort: n(v["sort"]) ?? 0,
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// Places the house has tended, and each visit: a count, never names
// ---------------------------------------------------------------------
const PLACE_SPECS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "name_ne", label: "Name in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: [
      { value: "hiti", label: "A hiti" },
      { value: "chautari", label: "A chautari" },
      { value: "other", label: "Another place" },
    ],
  },
  { key: "location", label: "Where it is", type: "text" },
  { key: "location_ne", label: "Where it is, in Nepali", type: "text" },
  { key: "note", label: "A line about it", type: "textarea", rows: 3 },
  { key: "note_ne", label: "The same, in Nepali", type: "textarea", rows: 3 },
  { key: "published", label: "Published", type: "checkbox" },
];

function PlaceVisits({ place }: { place: AdminPlace }) {
  const visits = useAdminPlaceVisits();
  const encounters = useAdminEncounters();
  const save = useSavePlaceVisit();
  const mine = (visits.data ?? []).filter((v) => v.place_id === place.id);
  const [before, setBefore] = React.useState<unknown>(null);
  const [after, setAfter] = React.useState<unknown>(null);
  const specs: FieldSpec[] = React.useMemo(
    () => [
      { key: "done_on", label: "Done on", type: "date", required: true },
      {
        key: "people_count",
        label: "How many came",
        type: "number",
        hint: "A count. Never names.",
      },
      {
        key: "event_id",
        label: "The Encounter it was part of",
        type: "select",
        options: (encounters.data ?? []).map((e) => ({ value: e.id ?? "", label: e.title ?? "" })),
      },
      { key: "note", label: "A line about it", type: "textarea", rows: 2 },
      { key: "note_ne", label: "The same, in Nepali", type: "textarea", rows: 2 },
      { key: "published", label: "Published", type: "checkbox" },
    ],
    [encounters.data],
  );
  return (
    <section className="flex flex-col gap-4 border-t pt-6" aria-labelledby="place-visits">
      <h2 id="place-visits" className="font-medium">
        Visits
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        {mine.map((v) => (
          <li key={v.id}>
            {v.done_on ? formatKathmanduDate(v.done_on) : ""}
            {v.people_count != null ? ` · ${v.people_count} came` : ""}
            {v.published ? "" : " · draft"}
          </li>
        ))}
        {mine.length === 0 && <li className="text-muted-foreground">No visit recorded yet.</li>}
      </ul>
      <PhotoUploader
        folder={`encounters/places/${place.slug}-before`}
        label={before ? "Before photograph ready. Replace it?" : "The before photograph (optional)"}
        onUploaded={(photo) => setBefore(photo)}
      />
      <PhotoUploader
        folder={`encounters/places/${place.slug}-after`}
        label={after ? "After photograph ready. Replace it?" : "The after photograph (optional)"}
        onUploaded={(photo) => setAfter(photo)}
      />
      <RecordForm
        specs={specs}
        initial={toValues(specs, null)}
        resetKey={`pv-${place.id}-${save.submittedAt}`}
        submitLabel="Record the visit"
        pending={save.isPending}
        error={save.error}
        onSubmit={(v) => {
          save.mutate(
            {
              p: {
                place_id: place.id,
                event_id: s(v["event_id"]),
                done_on: s(v["done_on"]),
                people_count: n(v["people_count"]),
                before_image: before,
                after_image: after,
                note: s(v["note"]),
                note_ne: s(v["note_ne"]),
                published: v["published"],
              },
            },
            {
              onSuccess: () => {
                setBefore(null);
                setAfter(null);
              },
            },
          );
        }}
      />
    </section>
  );
}

export function AdminPlacesPage() {
  const rows = useAdminPlaces();
  const save = useSavePlace();
  return (
    <CrudPage<AdminPlace>
      title="Places tended"
      intro="Common Ground's cleanups and restorations: a page for each hiti or chautari, with before and after, the date, and how many came."
      addLabel="Add a place"
      rows={rows.data}
      status={rows}
      specs={PLACE_SPECS}
      initial={(row, base) => (row ? base : { ...base, kind: "hiti" })}
      rowLabel={(r) => r.name ?? ""}
      rowDetail={(r) => `${r.kind}${r.published ? "" : " · draft"}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          slug: s(v["slug"]) ?? slugify(String(v["name"])),
          name: s(v["name"]),
          name_ne: s(v["name_ne"]),
          kind: v["kind"],
          location: s(v["location"]),
          location_ne: s(v["location_ne"]),
          note: s(v["note"]),
          note_ne: s(v["note_ne"]),
          published: v["published"],
        },
      })}
      mutation={save}
      extra={(p) => <PlaceVisits place={p} />}
    />
  );
}
