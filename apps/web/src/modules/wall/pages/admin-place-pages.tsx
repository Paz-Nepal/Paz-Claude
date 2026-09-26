import * as React from "react";
import { Button } from "@paz/ui";
import { formatKathmanduDate } from "@paz/utils";
import { useSiteInfo } from "@/modules/site";
import { useAdminPeople } from "../api/use-wall-admin";
import {
  useAdminBooks,
  useAdminDayDates,
  useAdminDays,
  useAdminRoomImages,
  useAdminRooms,
  useAdminStudioMonths,
  useAdminThings,
  useAdminWanted,
  useRemoveDayDate,
  useRemoveRoomImage,
  useSaveBook,
  useSaveDay,
  useSaveDayDate,
  useSaveRoom,
  useSaveRoomImage,
  useSaveStudioMonth,
  useSaveThing,
  useSaveWanted,
  useSetHouseStatus,
  type AdminBook,
  type AdminDay,
  type AdminRoom,
  type AdminStudioMonth,
  type AdminThing,
  type AdminWanted,
} from "../api/use-house-admin";
import { CrudPage } from "../components/crud-page";
import { PhotoUploader } from "../components/photo-uploader";
import { RecordForm, n, s, slugify, toValues, type FieldSpec } from "../components/record-form";

// ---------------------------------------------------------------------
// Is anyone home: one line, changed from the desk
// ---------------------------------------------------------------------
export function AdminHouseTodayPage() {
  const info = useSiteInfo();
  const set = useSetHouseStatus();
  const specs: FieldSpec[] = [
    {
      key: "status",
      label: "The line",
      type: "text",
      hint: "For example: The house is open this afternoon. It is shown on the home page and the House page, with the time you set it.",
    },
    { key: "status_ne", label: "The line in Nepali", type: "text" },
  ];
  const current = info.data?.["house.status"] ?? "";
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h2 className="font-serif text-2xl">The house today</h2>
      <p className="text-muted-foreground text-sm">
        Whether anyone is home. Saving replaces the line and stamps the time. Clear it and nothing
        is shown. It is never written into the static pages of the site, since it changes by the
        hour.
      </p>
      {current ? (
        <p className="text-sm">Showing now: {current}</p>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing is showing now.</p>
      )}
      <RecordForm
        specs={specs}
        initial={{ status: current, status_ne: info.data?.["house.status_ne"] ?? "" }}
        resetKey={`today-${set.submittedAt}-${current}`}
        submitLabel="Save the line"
        pending={set.isPending}
        error={set.error}
        onSubmit={(v) =>
          set.mutate({ status: String(v["status"] ?? ""), statusNe: String(v["status_ne"] ?? "") })
        }
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => set.mutate({ status: "", statusNe: "" })}
        >
          Clear the line
        </Button>
      </RecordForm>
      <p className="text-muted-foreground text-xs">
        This needs the permission to change settings. If saving is refused, ask an administrator.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Rooms, and their photographs
// ---------------------------------------------------------------------
const ROOM_SPECS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "name_ne", label: "Name in Nepali", type: "text" },
  {
    key: "slug",
    label: "Address",
    type: "text",
    required: true,
    hint: "Lower case, for the web address. The studio's room must be called studio.",
  },
  {
    key: "floor",
    label: "Where in the house",
    type: "text",
    hint: "For example: the ground floor, south side.",
  },
  { key: "note", label: "A line about it", type: "textarea", rows: 3 },
  { key: "note_ne", label: "A line about it, in Nepali", type: "textarea", rows: 3 },
  { key: "sort", label: "Order", type: "number" },
  {
    key: "published",
    label: "Published",
    type: "checkbox",
    hint: "Publish a room only when it exists as described. Nothing describes a room the house does not have.",
  },
];

function RoomImages({ room }: { room: AdminRoom }) {
  const images = useAdminRoomImages();
  const save = useSaveRoomImage();
  const remove = useRemoveRoomImage();
  const mine = (images.data ?? []).filter((i) => i.room_id === room.id);
  return (
    <section className="flex flex-col gap-3 border-t pt-6" aria-labelledby="room-photos">
      <h2 id="room-photos" className="font-medium">
        Photographs of this room
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        {mine.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-4">
            <span>
              {i.alt} · {i.photographer}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              loading={remove.isPending}
              onClick={() => remove.mutate({ p_id: i.id })}
            >
              Remove
            </Button>
          </li>
        ))}
        {mine.length === 0 && <li className="text-muted-foreground">No photograph yet.</li>}
      </ul>
      <PhotoUploader
        folder={`house/rooms/${room.slug}`}
        label="Add a photograph"
        withNepaliAlt
        onUploaded={(photo) =>
          save.mutateAsync({ p: { room_id: room.id, sort: mine.length, ...photo } })
        }
      />
    </section>
  );
}

export function AdminRoomsPage() {
  const rooms = useAdminRooms();
  const save = useSaveRoom();
  return (
    <CrudPage<AdminRoom>
      title="Rooms"
      intro="The rooms of the house, each with its photographs. Work is hung in a room from the work's own screen."
      addLabel="Add a room"
      rows={rooms.data}
      status={rooms}
      specs={ROOM_SPECS}
      rowLabel={(r) => r.name ?? ""}
      rowDetail={(r) => `${r.floor ?? ""}${r.published ? "" : " · draft"}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          slug: s(v["slug"]) ?? slugify(String(v["name"])),
          name: s(v["name"]),
          name_ne: s(v["name_ne"]),
          floor: s(v["floor"]),
          note: s(v["note"]),
          note_ne: s(v["note_ne"]),
          sort: n(v["sort"]) ?? 0,
          published: v["published"],
        },
      })}
      mutation={save}
      extra={(room) => <RoomImages room={room} />}
    />
  );
}

// ---------------------------------------------------------------------
// Things: nothing is bought as a set. Each has a line of where it came from.
// ---------------------------------------------------------------------
function ThingPicture({ thing }: { thing: AdminThing }) {
  const save = useSaveThing();
  return (
    <section className="flex flex-col gap-3 border-t pt-6" aria-labelledby="thing-photo">
      <h2 id="thing-photo" className="font-medium">
        Photograph
      </h2>
      <p className="text-muted-foreground text-sm">
        {thing.image_path ? `Present: ${thing.image_alt ?? ""}` : "No photograph yet."}
      </p>
      <PhotoUploader
        folder={`house/things/${slugify(thing.name ?? "thing")}`}
        label={thing.image_path ? "Replace the photograph" : "Add a photograph"}
        onUploaded={(photo) =>
          save.mutateAsync({
            p: {
              id: thing.id,
              name: thing.name,
              name_ne: thing.name_ne,
              came_from: thing.came_from,
              came_from_ne: thing.came_from_ne,
              given_by: thing.given_by,
              given_by_shown: thing.given_by_shown,
              room_id: thing.room_id,
              for_use: thing.for_use,
              published: thing.published,
              image_path: photo.original_path,
              image_width: photo.width,
              image_height: photo.height,
              image_variants: photo.variants,
              image_alt: photo.alt,
              image_photographer: photo.photographer,
            },
          })
        }
      />
    </section>
  );
}

export function AdminThingsPage() {
  const things = useAdminThings();
  const rooms = useAdminRooms();
  const save = useSaveThing();
  const specs: FieldSpec[] = React.useMemo(
    () => [
      { key: "name", label: "What it is", type: "text", required: true },
      { key: "name_ne", label: "What it is, in Nepali", type: "text" },
      { key: "came_from", label: "Where it came from", type: "textarea", rows: 2 },
      { key: "came_from_ne", label: "Where it came from, in Nepali", type: "textarea", rows: 2 },
      {
        key: "given_by",
        label: "Given by",
        type: "text",
        hint: "Kept privately unless the box below is ticked.",
      },
      {
        key: "given_by_shown",
        label: "The giver has said yes to being named on the site",
        type: "checkbox",
      },
      {
        key: "room_id",
        label: "Where it is",
        type: "select",
        options: (rooms.data ?? []).map((r) => ({ value: r.id ?? "", label: r.name ?? "" })),
      },
      { key: "for_use", label: "For use: a visitor may use it", type: "checkbox" },
      { key: "published", label: "Published", type: "checkbox" },
    ],
    [rooms.data],
  );
  return (
    <CrudPage<AdminThing>
      title="Things"
      intro="Each chair, pot and shelf has a line saying where it came from and who gave it. A giver's name appears only when they have said yes."
      addLabel="Add a thing"
      rows={things.data}
      status={things}
      specs={specs}
      rowLabel={(r) => r.name ?? ""}
      rowDetail={(r) => `${r.published ? "" : "draft · "}${r.for_use ? "for use" : ""}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          name: s(v["name"]),
          name_ne: s(v["name_ne"]),
          came_from: s(v["came_from"]),
          came_from_ne: s(v["came_from_ne"]),
          given_by: s(v["given_by"]),
          given_by_shown: v["given_by_shown"],
          room_id: s(v["room_id"]),
          for_use: v["for_use"],
          published: v["published"],
          image_path: r?.image_path ?? null,
          image_width: r?.image_width ?? null,
          image_height: r?.image_height ?? null,
          image_variants: r?.image_variants ?? [],
          image_alt: r?.image_alt ?? null,
          image_photographer: r?.image_photographer ?? null,
        },
      })}
      mutation={save}
      extra={(t) => <ThingPicture thing={t} />}
    />
  );
}

// ---------------------------------------------------------------------
// What the house would welcome
// ---------------------------------------------------------------------
const WANTED_SPECS: FieldSpec[] = [
  { key: "what", label: "What", type: "text", required: true },
  { key: "what_ne", label: "What, in Nepali", type: "text" },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: [
      { value: "thing", label: "A thing for the house" },
      { value: "book", label: "A book for the reading room" },
    ],
  },
  { key: "note", label: "A line about it", type: "text" },
  { key: "note_ne", label: "A line about it, in Nepali", type: "text" },
  { key: "sort", label: "Order", type: "number" },
  {
    key: "still_wanted",
    label: "Still wanted",
    type: "checkbox",
    hint: "Untick it once it has arrived.",
  },
];

export function AdminWantedPage() {
  const rows = useAdminWanted();
  const save = useSaveWanted();
  return (
    <CrudPage<AdminWanted>
      title="What the house would welcome"
      intro="A short list, so people can give furniture and books with their story."
      addLabel="Add a want"
      rows={rows.data}
      status={rows}
      specs={WANTED_SPECS}
      initial={(row, base) => (row ? base : { ...base, kind: "thing", still_wanted: true })}
      rowLabel={(r) => r.what ?? ""}
      rowDetail={(r) => `${r.kind}${r.still_wanted ? "" : " · no longer wanted"}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          kind: v["kind"],
          what: s(v["what"]),
          what_ne: s(v["what_ne"]),
          note: s(v["note"]),
          note_ne: s(v["note_ne"]),
          sort: n(v["sort"]) ?? 0,
          still_wanted: v["still_wanted"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// The reading room's shelves
// ---------------------------------------------------------------------
const BOOK_SPECS: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "author", label: "Author", type: "text" },
  { key: "language", label: "Language", type: "text" },
  { key: "shelf", label: "Shelf", type: "text" },
  { key: "note", label: "A line about it", type: "text" },
  { key: "note_ne", label: "A line about it, in Nepali", type: "text" },
  { key: "published", label: "Published", type: "checkbox" },
];

export function AdminBooksPage() {
  const rows = useAdminBooks();
  const save = useSaveBook();
  return (
    <CrudPage<AdminBook>
      title="The reading room"
      intro="A room to read in, not a lending library. These are the books on its shelves."
      addLabel="Add a book"
      rows={rows.data}
      status={rows}
      specs={BOOK_SPECS}
      rowLabel={(r) => r.title ?? ""}
      rowDetail={(r) => `${r.author ?? ""}${r.published ? "" : " · draft"}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          title: s(v["title"]),
          author: s(v["author"]),
          language: s(v["language"]),
          shelf: s(v["shelf"]),
          note: s(v["note"]),
          note_ne: s(v["note_ne"]),
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// Who is making in the studio
// ---------------------------------------------------------------------
export function AdminStudioPage() {
  const rows = useAdminStudioMonths();
  const people = useAdminPeople();
  const save = useSaveStudioMonth();
  const nameById = new Map((people.data ?? []).map((p) => [p.id, p.name]));
  const specs: FieldSpec[] = React.useMemo(
    () => [
      {
        key: "person_id",
        label: "Who is making",
        type: "select",
        required: true,
        options: (people.data ?? []).map((p) => ({ value: p.id ?? "", label: p.name ?? "" })),
      },
      { key: "from_on", label: "From", type: "date", required: true },
      { key: "to_on", label: "To", type: "date", required: true },
      { key: "note", label: "A line about it", type: "text" },
      { key: "note_ne", label: "A line about it, in Nepali", type: "text" },
      { key: "published", label: "Published", type: "checkbox" },
    ],
    [people.data],
  );
  return (
    <CrudPage<AdminStudioMonth>
      title="The studio"
      intro="The painter of the month. The current entry is shown on the home page; past months become the studio's own record on its room page (the room must have the address studio)."
      addLabel="Add a month"
      rows={rows.data}
      status={rows}
      specs={specs}
      rowLabel={(r) => nameById.get(r.person_id) ?? ""}
      rowDetail={(r) =>
        `${r.from_on ? formatKathmanduDate(r.from_on) : ""} to ${r.to_on ? formatKathmanduDate(r.to_on) : ""}${r.published ? "" : " · draft"}`
      }
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          person_id: s(v["person_id"]),
          from_on: s(v["from_on"]),
          to_on: s(v["to_on"]),
          note: s(v["note"]),
          note_ne: s(v["note_ne"]),
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// The days the house keeps, and the date each falls on this year
// ---------------------------------------------------------------------
const DAY_SPECS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "name_ne", label: "Name in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  {
    key: "reckoning",
    label: "Reckoned by",
    type: "select",
    required: true,
    options: [
      { value: "nepal_sambat", label: "Nepal Sambat" },
      { value: "bikram_sambat", label: "Bikram Sambat" },
      { value: "gregorian", label: "The Gregorian calendar" },
    ],
  },
  { key: "reckoned_as", label: "How it is reckoned, in words", type: "text" },
  { key: "reckoned_as_ne", label: "How it is reckoned, in Nepali", type: "text" },
  { key: "what_the_house_does", label: "What the house does", type: "textarea", rows: 3 },
  {
    key: "what_the_house_does_ne",
    label: "What the house does, in Nepali",
    type: "textarea",
    rows: 3,
  },
  { key: "published", label: "Published", type: "checkbox" },
];

function DayDates({ day }: { day: AdminDay }) {
  const dates = useAdminDayDates();
  const save = useSaveDayDate();
  const remove = useRemoveDayDate();
  const mine = (dates.data ?? []).filter((d) => d.day_id === day.id);
  const specs: FieldSpec[] = [
    { key: "falls_on", label: "Falls on", type: "date", required: true },
    {
      key: "sambat_text",
      label: "The Nepal Sambat date, as words",
      type: "text",
      hint: "Optional. Lunar days move, so nothing is worked out for you.",
    },
  ];
  return (
    <section className="flex flex-col gap-3 border-t pt-6" aria-labelledby="day-dates">
      <h2 id="day-dates" className="font-medium">
        Dates
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        {mine.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4">
            <span>
              {d.falls_on ? formatKathmanduDate(d.falls_on) : ""}
              {d.sambat_text ? ` · ${d.sambat_text}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              loading={remove.isPending}
              onClick={() => remove.mutate({ p_id: d.id })}
            >
              Remove
            </Button>
          </li>
        ))}
        {mine.length === 0 && <li className="text-muted-foreground">No date entered yet.</li>}
      </ul>
      <RecordForm
        specs={specs}
        initial={toValues(specs, null)}
        resetKey={`dd-${day.id}-${save.submittedAt}`}
        submitLabel="Add the date"
        pending={save.isPending}
        error={save.error}
        onSubmit={(v) =>
          save.mutate({
            p: { day_id: day.id, falls_on: s(v["falls_on"]), sambat_text: s(v["sambat_text"]) },
          })
        }
      />
    </section>
  );
}

export function AdminDaysPage() {
  const rows = useAdminDays();
  const save = useSaveDay();
  return (
    <CrudPage<AdminDay>
      title="The house's year"
      intro="The festivals and days the house keeps, and what it does on each. Lunar days move, so the date is entered each year."
      addLabel="Add a day"
      rows={rows.data}
      status={rows}
      specs={DAY_SPECS}
      rowLabel={(r) => r.name ?? ""}
      rowDetail={(r) => `${r.reckoning}${r.published ? "" : " · draft"}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          slug: s(v["slug"]) ?? slugify(String(v["name"])),
          name: s(v["name"]),
          name_ne: s(v["name_ne"]),
          reckoning: v["reckoning"],
          reckoned_as: s(v["reckoned_as"]),
          reckoned_as_ne: s(v["reckoned_as_ne"]),
          what_the_house_does: s(v["what_the_house_does"]),
          what_the_house_does_ne: s(v["what_the_house_does_ne"]),
          published: v["published"],
        },
      })}
      mutation={save}
      extra={(d) => <DayDates day={d} />}
    />
  );
}
