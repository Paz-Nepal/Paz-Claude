import * as React from "react";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import {
  findPersonByEmail,
  useAdminEncounters,
  useAdminGuild,
  useAdminPeople,
  useAdminRoles,
  useAdminTreasury,
  useAssemblyReadiness,
  useCommonsAssemblies,
  useCommonsRegister,
  useCommonsTables,
  useConcerns,
  useConcurrenceRoll,
  useConfirmTableKept,
  useRecordPunchDestruction,
  useReportTableKept,
  useSaveAssembly,
  useSaveCommonsPerson,
  useSaveEncounter,
  useSaveGuildMaker,
  useSaveRole,
  useSaveTreasury,
  type AdminEncounter,
  type AdminGuildMaker,
  type AdminRole,
  type AdminTreasuryAccount,
} from "../api/use-wall-admin";
import { CrudPage } from "../components/crud-page";
import {
  RecordForm,
  money,
  n,
  s,
  slugify,
  toValues,
  type FieldSpec,
} from "../components/record-form";

/** A jsonb field read back as text, never as [object Object]. */
const asText = (v: unknown, fallback: string) => (typeof v === "string" && v ? v : fallback);

const rupees = (minor: number | null | undefined) => (minor == null ? "" : String(minor / 100));

// ---------------------------------------------------------------------
// Hands: every named role and office, who holds it, which are open.
// ---------------------------------------------------------------------
const ROLE_SPECS: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "title_ne", label: "Title in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: [
      { value: "role", label: "Role" },
      { value: "office", label: "Office" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "open", label: "Open" },
      { value: "held", label: "Held" },
      { value: "dormant", label: "Dormant (an office with a waking trigger)" },
    ],
  },
  { key: "holder_name", label: "Held by", type: "text", hint: "Required when held." },
  { key: "waking_trigger", label: "Wakes when", type: "text" },
  { key: "term_starts_on", label: "Term starts", type: "date" },
  { key: "term_ends_on", label: "Term ends", type: "date" },
  { key: "work", label: "The work", type: "textarea", rows: 3, hint: "The house's words." },
  { key: "asks", label: "What it asks", type: "textarea", rows: 3 },
  { key: "gives", label: "What it gives back", type: "textarea", rows: 3 },
  { key: "how_to_say_yes", label: "How to say yes", type: "textarea", rows: 3 },
  { key: "sort", label: "Order", type: "number" },
  {
    key: "published",
    label: "Published",
    type: "checkbox",
    hint: "An open seat is a promise. Publish it only when the house means it.",
  },
];

export function AdminRolesPage() {
  const rows = useAdminRoles();
  const save = useSaveRole();
  return (
    <CrudPage<AdminRole>
      title="Hands"
      intro="Every named role and office in the house, who holds it, and which seats are open. Only who holds what is shown publicly."
      addLabel="Add a role"
      rows={rows.data}
      status={rows}
      specs={ROLE_SPECS}
      rowLabel={(r) => r.title ?? ""}
      rowDetail={(r) =>
        `${r.status}${r.holder_name ? `: ${r.holder_name}` : ""}${r.published ? "" : " · draft"}`
      }
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          slug: s(v["slug"]) ?? slugify(String(v["title"])),
          title: s(v["title"]),
          title_ne: s(v["title_ne"]),
          kind: v["kind"],
          status: v["status"],
          holder_name: s(v["holder_name"]),
          waking_trigger: s(v["waking_trigger"]),
          term_starts_on: s(v["term_starts_on"]),
          term_ends_on: s(v["term_ends_on"]),
          work: s(v["work"]),
          asks: s(v["asks"]),
          gives: s(v["gives"]),
          how_to_say_yes: s(v["how_to_say_yes"]),
          sort: n(v["sort"]),
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------
const ENCOUNTER_SPECS: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "title_ne", label: "Title in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: [
      { value: "field_study", label: "Field Study" },
      { value: "common_ground", label: "Common Ground" },
      { value: "chautari", label: "The Chautari" },
      { value: "workshop", label: "Workshop (sells a day, never formation, never a hallmark)" },
    ],
  },
  { key: "starts_on", label: "Starts", type: "date", required: true },
  { key: "ends_on", label: "Ends", type: "date" },
  { key: "place", label: "Place", type: "text" },
  { key: "place_ne", label: "Place in Nepali", type: "text" },
  { key: "how_to_turn_up", label: "How to turn up", type: "textarea", rows: 3 },
  { key: "how_to_turn_up_ne", label: "How to turn up, in Nepali", type: "textarea", rows: 3 },
  {
    key: "leads_ne",
    label: "Nepali first",
    type: "checkbox",
    hint: "For anything addressed to the neighbourhood rather than the world.",
  },
  { key: "published", label: "Published", type: "checkbox" },
];

export function AdminEncountersPage() {
  const rows = useAdminEncounters();
  const save = useSaveEncounter();
  return (
    <CrudPage<AdminEncounter>
      title="Encounters"
      intro="Public civic work, with dates, a place, and a way to turn up. Keep it apart from anything that asks a person to belong: nothing here links to formation, the Commons or Friends."
      addLabel="Add an encounter"
      rows={rows.data}
      status={rows}
      specs={ENCOUNTER_SPECS}
      rowLabel={(r) => r.title ?? ""}
      rowDetail={(r) => `${r.kind} · ${r.starts_on}${r.published ? "" : " · draft"}`}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          slug: s(v["slug"]) ?? slugify(String(v["title"])),
          kind: v["kind"],
          title: s(v["title"]),
          title_ne: s(v["title_ne"]),
          starts_on: s(v["starts_on"]),
          ends_on: s(v["ends_on"]),
          place: s(v["place"]),
          place_ne: s(v["place_ne"]),
          how_to_turn_up: s(v["how_to_turn_up"]),
          how_to_turn_up_ne: s(v["how_to_turn_up_ne"]),
          leads_ne: v["leads_ne"],
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// Treasury: the Annual's account, reported once a year.
// ---------------------------------------------------------------------
const TREASURY_SPECS: FieldSpec[] = [
  {
    key: "year_span",
    label: "Year",
    type: "text",
    required: true,
    hint: "The house's year runs from the anniversary; name it by that span.",
  },
  {
    key: "patronage_share",
    label: "Patronage share given from after-tax profit (NPR)",
    type: "number",
  },
  { key: "patronage_note", label: "Patronage note", type: "text" },
  { key: "tithe_base", label: "Harmonised base for the tithe (NPR)", type: "number" },
  { key: "tithe", label: "Tithe (NPR)", type: "number" },
  {
    key: "largest_share_pct",
    label: "Largest single share of the year's giving (%)",
    type: "number",
    hint: "The one-fifth rule is checked and reported: over 20 is reported as not met.",
  },
  { key: "gifts_note", label: "Gifts under the subsidiary instrument", type: "textarea", rows: 3 },
  { key: "instruments_note", label: "Instruments in force", type: "textarea", rows: 3 },
  { key: "published", label: "Published", type: "checkbox" },
];

export function AdminTreasuryPage() {
  const rows = useAdminTreasury();
  const save = useSaveTreasury();
  return (
    <CrudPage<AdminTreasuryAccount>
      title="Treasury account"
      intro="The account goes into the Annual. It is reported once a year, not shown as a live dashboard."
      addLabel="Add a year"
      rows={rows.data}
      status={rows}
      specs={TREASURY_SPECS}
      rowLabel={(r) => r.year_span ?? ""}
      rowDetail={(r) => (r.published ? "published" : "draft")}
      initial={(r, base) => ({
        ...base,
        patronage_share: rupees(r?.patronage_share_minor),
        tithe_base: rupees(r?.tithe_base_minor),
        tithe: rupees(r?.tithe_minor),
        largest_share_pct: r?.largest_share_pct == null ? "" : String(r.largest_share_pct),
      })}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          year_span: s(v["year_span"]),
          patronage_share_minor: money(v["patronage_share"]),
          patronage_note: s(v["patronage_note"]),
          tithe_base_minor: money(v["tithe_base"]),
          tithe_minor: money(v["tithe"]),
          largest_share_pct: s(v["largest_share_pct"]),
          gifts_note: s(v["gifts_note"]),
          instruments_note: s(v["instruments_note"]),
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}

// ---------------------------------------------------------------------
// Guild: the hallmark register.
// ---------------------------------------------------------------------
export function AdminGuildPage() {
  const rows = useAdminGuild();
  const people = useAdminPeople();
  const save = useSaveGuildMaker();
  const destroy = useRecordPunchDestruction();
  const specs: FieldSpec[] = [
    {
      key: "person_id",
      label: "Maker",
      type: "select",
      required: true,
      options: (people.data ?? []).map((p) => ({ value: p.id as string, label: p.name as string })),
    },
    {
      key: "stage",
      label: "Stage",
      type: "select",
      required: true,
      options: ["learner", "apprentice", "maker", "teacher"].map((x) => ({ value: x, label: x })),
      hint: "Recognition, never examination.",
    },
    { key: "mark_description", label: "The maker's own mark, in words", type: "text" },
    { key: "year_letter", label: "Year letter", type: "text", hint: "One capital letter." },
    { key: "registered_on", label: "Registered on", type: "date" },
    {
      key: "presented_on",
      label: "Presented at the Table on",
      type: "date",
      hint: "An apprenticeship ends with a presentation at the Table, entered in the Record.",
    },
    { key: "published", label: "Published in the register", type: "checkbox" },
  ];
  return (
    <CrudPage<AdminGuildMaker>
      title="Guild: the hallmark register"
      intro="A struck row can be verified only against this register. The house's punch attests formation, never quality, ownership or endorsement."
      addLabel="Register a maker"
      rows={rows.data}
      status={rows}
      specs={specs}
      rowLabel={(r) => r.person_name ?? ""}
      rowDetail={(r) =>
        `${r.stage}${r.year_letter ? ` · ${r.year_letter}` : ""}${r.destroyed_on ? " · punch destroyed" : ""}${r.published ? "" : " · draft"}`
      }
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          person_id: s(v["person_id"]),
          stage: v["stage"],
          mark_description: s(v["mark_description"]),
          year_letter: s(v["year_letter"]),
          registered_on: s(v["registered_on"]),
          presented_on: s(v["presented_on"]),
          published: v["published"],
        },
      })}
      mutation={save}
      extra={(r) => (
        <div className="flex flex-col gap-3 border-t pt-6">
          <h2 className="font-medium">A punch that has left the house&rsquo;s keeping</h2>
          <p className="text-muted-foreground text-sm">
            It is destroyed, not recovered, and the destruction is recorded here. A register that
            cannot show a retired mark is not a register. Destructions are never changed.
          </p>
          <RecordForm
            specs={[
              { key: "destroyed_on", label: "Destroyed on", type: "date", required: true },
              { key: "note", label: "Note", type: "text" },
            ]}
            initial={{ destroyed_on: "", note: "" }}
            resetKey={`d-${r.id}-${destroy.submittedAt}`}
            submitLabel="Record the destruction"
            pending={destroy.isPending}
            error={destroy.error}
            onSubmit={(v) =>
              destroy.mutate({ p_maker: r.id, p_on: s(v["destroyed_on"]), p_note: s(v["note"]) })
            }
          />
        </div>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// Commons: the register, Tables kept, the concurrence roll, the Assembly.
// A rung is set by the house recording that the covenant words were said.
// It is never set by a payment or an application, and nothing on this page
// reads a Friends tier.
// ---------------------------------------------------------------------
const RUNGS = ["guest", "companion", "denizen", "steward", "elder", "ancestor"];

export function AdminCommonsPage() {
  const register = useCommonsRegister();
  const tables = useCommonsTables();
  const assemblies = useCommonsAssemblies();
  const readiness = useAssemblyReadiness();
  const savePerson = useSaveCommonsPerson();
  const report = useReportTableKept();
  const confirm = useConfirmTableKept();
  const saveAssembly = useSaveAssembly();
  const [year, setYear] = React.useState(new Date().getFullYear());
  const roll = useConcurrenceRoll(year);
  const [email, setEmail] = React.useState("");
  const [found, setFound] = React.useState<{ id: string; name: string } | null>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);

  const personSpecs: FieldSpec[] = [
    {
      key: "rung",
      label: "Rung",
      type: "select",
      required: true,
      options: RUNGS.map((r) => ({ value: r, label: r })),
    },
    {
      key: "covenant_said_on",
      label: "Covenant words said on",
      type: "date",
      hint: "Required for Denizen and every rung above. A rung is entered by presence and by saying the words, never bought.",
    },
    { key: "rung_since", label: "On this rung since", type: "date" },
    { key: "abroad", label: "Abroad", type: "checkbox" },
    { key: "dues_band", label: "Dues band (scaled to means)", type: "text" },
    { key: "released_on", label: "Released on", type: "date", hint: "Leaving is always allowed." },
    { key: "release_reason", label: "Grounds for release", type: "text" },
    { key: "deceased_on", label: "Died on", type: "date", hint: "Marked here and nowhere public." },
  ];

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-2xl">The Commons</h1>
      <p className="text-muted-foreground text-sm">
        A register the house keeps. Nothing here is offered, sold or applied for. Nothing about it
        is ever published.
      </p>

      <section className="flex flex-col gap-3" aria-labelledby="c-add">
        <h2 id="c-add" className="font-medium">
          Enter or change a person on the register
        </h2>
        <Field label="Their email in the house's records" htmlFor="c-email">
          <Input
            id="c-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => {
            setLookupError(null);
            void findPersonByEmail(email.trim())
              .then((p) => {
                setFound(p);
                if (!p) setLookupError("No one is on record with that email.");
              })
              .catch((e: unknown) => setLookupError(toAppError(e).message));
          }}
        >
          Find
        </Button>
        {lookupError && (
          <p role="alert" className="text-destructive text-sm">
            {lookupError}
          </p>
        )}
        {found && (
          <RecordForm
            specs={personSpecs}
            initial={{ ...toValues(personSpecs, null), rung: "guest" }}
            resetKey={`p-${found.id}-${savePerson.submittedAt}`}
            submitLabel={`Save ${found.name}`}
            pending={savePerson.isPending}
            error={savePerson.error}
            onSubmit={(v) =>
              savePerson.mutate({
                p: {
                  person_id: found.id,
                  rung: v["rung"],
                  covenant_said_on: s(v["covenant_said_on"]),
                  rung_since: s(v["rung_since"]),
                  abroad: v["abroad"],
                  dues_band: s(v["dues_band"]),
                  released_on: s(v["released_on"]),
                  release_reason: s(v["release_reason"]),
                  deceased_on: s(v["deceased_on"]),
                },
              })
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="c-reg">
        <h2 id="c-reg" className="font-medium">
          Register
        </h2>
        {register.data && register.data.length === 0 && (
          <p className="text-sm">No one is on the register.</p>
        )}
        <ul className="text-sm">
          {(register.data ?? []).map((c) => (
            <li key={c.person_id}>
              {c.name} · {c.rung}
              {c.abroad ? " · abroad" : ""}
              {c.released_on ? " · released" : ""}
              {c.deceased_on ? " · deceased" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="c-tables">
        <h2 id="c-tables" className="font-medium">
          Tables kept
        </h2>
        <p className="text-muted-foreground text-sm">
          A Denizen abroad reports a Table kept, a person confirms it, and it becomes a Chronicle
          line. Nothing about who attended is ever recorded.
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {(tables.data ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4">
              <span>
                {t.held_on} · kept by {t.kept_by}
                {t.place ? ` · ${t.place}` : ""}
                {t.confirmed_on ? " · confirmed" : ""}
              </span>
              {!t.confirmed_on && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={confirm.isPending}
                  onClick={() => confirm.mutate({ p_id: t.id })}
                >
                  Confirm
                </Button>
              )}
            </li>
          ))}
        </ul>
        {found && (
          <RecordForm
            specs={[
              { key: "held_on", label: "Held on", type: "date", required: true },
              { key: "place", label: "Where", type: "text" },
            ]}
            initial={{ held_on: "", place: "" }}
            resetKey={`t-${found.id}-${report.submittedAt}`}
            submitLabel={`Report a Table kept by ${found.name}`}
            pending={report.isPending}
            error={report.error}
            onSubmit={(v) =>
              report.mutate({
                p_person: found.id,
                p_held_on: s(v["held_on"]),
                p_place: s(v["place"]),
              })
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="c-roll">
        <h2 id="c-roll" className="font-medium">
          Concurrence roll
        </h2>
        <p className="text-muted-foreground text-sm">
          Denizens abroad who kept the Table in the year before. Shown to the house, never
          published. Under twenty-five the diaspora leg folds into the Assembly.
        </p>
        <Field label="Year" htmlFor="c-year">
          <Input
            id="c-year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </Field>
        {roll.isError && (
          <p role="alert" className="text-destructive text-sm">
            {toAppError(roll.error).message}
          </p>
        )}
        {roll.data && (
          <>
            <p className="text-sm">
              {roll.data.length} on the roll.
              {roll.data.length < 25 ? " Under twenty-five: the leg folds into the Assembly." : ""}
            </p>
            <ul className="text-sm">
              {roll.data.map((r) => (
                <li key={r.person_id}>{r.name}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="c-assembly">
        <h2 id="c-assembly" className="font-medium">
          The Assembly
        </h2>
        {readiness.data?.[0] && (
          <p className="text-sm">
            Denizens: {readiness.data[0].denizens}. Adopted:{" "}
            {readiness.data[0].adopted_on ?? "not entered (setting commons.adopted_on)"}.{" "}
            {readiness.data[0].ready
              ? "The Assembly is due: twenty-five Denizens, or five years from adoption."
              : "Not yet due."}
          </p>
        )}
        {(assemblies.data ?? []).map((a) => (
          <article key={a.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              Held {a.held_on}
              {a.roll_size != null ? ` · roll of ${a.roll_size}` : ""}
            </p>
            <ul>
              {((a.motions ?? []) as Array<Record<string, unknown>>).map((m) => (
                <li key={String(m["id"])}>
                  {String(m["text"])} ({String(m["threshold"])}
                  {m["touches_entrenched"] ? ", entrenched clause" : ""}
                  {m["extraordinary"] ? ", Extraordinary Act" : ""}):{" "}
                  {asText(m["outcome"], "no outcome yet")}
                  {m["amendment_ref"] ? ` · amendment ${asText(m["amendment_ref"], "")}` : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
        <RecordForm
          specs={[
            { key: "held_on", label: "Held on", type: "date", required: true },
            { key: "roll_size", label: "Roll size", type: "number" },
            { key: "notes", label: "Notes", type: "text" },
            { key: "motion", label: "A motion (its text)", type: "textarea", rows: 3 },
            { key: "threshold", label: "Threshold", type: "text" },
            { key: "touches_entrenched", label: "Touches an entrenched clause", type: "checkbox" },
            {
              key: "extraordinary",
              label: "An Extraordinary Act (higher threshold)",
              type: "checkbox",
            },
            { key: "votes_for", label: "For", type: "number" },
            { key: "votes_against", label: "Against", type: "number" },
            { key: "abstentions", label: "Abstentions", type: "number" },
            {
              key: "outcome",
              label: "Outcome",
              type: "select",
              options: ["carried", "failed", "withdrawn"].map((x) => ({ value: x, label: x })),
            },
            {
              key: "amendment_ref",
              label: "Canon amendment (by addition)",
              type: "text",
              hint: "The outcome is written as a canon amendment by addition.",
            },
          ]}
          initial={{
            held_on: "",
            roll_size: "",
            notes: "",
            motion: "",
            threshold: "",
            touches_entrenched: false,
            extraordinary: false,
            votes_for: "",
            votes_against: "",
            abstentions: "",
            outcome: "",
            amendment_ref: "",
          }}
          resetKey={`a-${saveAssembly.submittedAt}`}
          submitLabel="Record the Assembly"
          pending={saveAssembly.isPending}
          error={saveAssembly.error}
          onSubmit={(v) =>
            saveAssembly.mutate({
              p: {
                held_on: s(v["held_on"]),
                roll_size: n(v["roll_size"]),
                notes: s(v["notes"]),
                motions: s(v["motion"])
                  ? [
                      {
                        text: s(v["motion"]),
                        threshold: s(v["threshold"]) ?? "",
                        touches_entrenched: v["touches_entrenched"],
                        extraordinary: v["extraordinary"],
                        votes_for: n(v["votes_for"]),
                        votes_against: n(v["votes_against"]),
                        abstentions: n(v["abstentions"]),
                        outcome: s(v["outcome"]),
                        amendment_ref: s(v["amendment_ref"]),
                      },
                    ]
                  : [],
              },
            })
          }
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// Safeguarding concerns: readable only by the one holder of
// safeguarding.read, never by the people a concern might be about.
// ---------------------------------------------------------------------
export function AdminConcernsPage() {
  const rows = useConcerns();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Safeguarding concerns</h1>
      <p className="text-muted-foreground text-sm">
        Visible only to the person who holds the safeguarding permission. It does not pass through
        anyone a concern might be about.
      </p>
      {rows.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {rows.isError && (
        <StatePanel title="Couldn't load concerns." description={toAppError(rows.error).message} />
      )}
      {rows.data && rows.data.length === 0 && <StatePanel title="Nothing yet." description="" />}
      <ul className="flex flex-col gap-3">
        {(rows.data ?? []).map((r) => (
          <li key={r.id} className="rounded-lg border p-4 text-sm">
            <p className="whitespace-pre-line">{r.body}</p>
            <p className="text-muted-foreground mt-2">
              {r.writer_name ?? "No name given"}
              {r.contact ? ` · ${r.contact}` : ""}
              {r.submitted_at ? ` · ${formatKathmanduDate(r.submitted_at)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
