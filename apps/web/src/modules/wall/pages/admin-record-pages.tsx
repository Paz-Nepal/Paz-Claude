import * as React from "react";
import { Button } from "@paz/ui";
import { formatKathmanduDate } from "@paz/utils";
import { useAuthorization } from "@/modules/auth-core";
import {
  useAddConsentLine,
  useAdminAccessions,
  useAdminClosed,
  useAdminConsentLines,
  useAdminHousePapers,
  useAdminParts,
  useAssignAccessionNumber,
  useRecordListening,
  useSaveAccession,
  useSaveClosed,
  useSaveHousePaper,
  useSavePart,
  useWithdrawAccession,
  type AdminAccession,
  type AdminHousePaper,
} from "../api/use-house-admin";
import { CrudPage } from "../components/crud-page";
import { RecordForm, n, s, toValues, type FieldSpec } from "../components/record-form";

const KIND = [
  { value: "voice", label: "A voice" },
  { value: "photographs", label: "Photographs" },
  { value: "papers", label: "Family papers" },
  { value: "the_present", label: "Documentation of the present" },
  { value: "other", label: "Something else" },
];

const TIER = [
  { value: "online", label: "Online" },
  { value: "in_house_works", label: "In the house's own works" },
  { value: "anyone_in_house", label: "Anyone who comes and asks, in the house" },
  { value: "people_of_house", label: "The people of the house" },
  { value: "family_only", label: "The family only" },
  { value: "no_one", label: "No one, until the date it opens" },
];

const COPY = [
  { value: "not_yet", label: "Not yet made" },
  { value: "held", label: "Held" },
  { value: "lost", label: "Lost" },
];

const ACCESSION_SPECS: FieldSpec[] = [
  { key: "kind", label: "What was given", type: "select", required: true, options: KIND },
  { key: "dates_from", label: "The material dates from", type: "date" },
  { key: "dates_to", label: "to", type: "date" },
  {
    key: "listening_tier",
    label: "Who may listen (the ruling)",
    type: "select",
    required: true,
    options: TIER,
    hint: "One accession has one ruling. Material under different rulings arrives as separate accessions.",
  },
  {
    key: "description_level",
    label: "What may be said about the content",
    type: "select",
    required: true,
    options: [
      { value: "none", label: "Nothing" },
      { value: "subjects", label: "The subjects only" },
      { value: "account", label: "A short account" },
    ],
  },
  {
    key: "description",
    label: "The subjects or account",
    type: "textarea",
    rows: 3,
    hint: "Shown only once the holding opens. Required if anything is to be said.",
  },
  { key: "description_ne", label: "The same, in Nepali", type: "textarea", rows: 3 },
  {
    key: "opens_on",
    label: "Opens on",
    type: "date",
    hint: "The giver's chosen date. Required for a holding open to no one: there is no perpetual seal.",
  },
  { key: "copy_first", label: "First copy", type: "select", required: true, options: COPY },
  { key: "copy_second", label: "Second copy", type: "select", required: true, options: COPY },
  { key: "copy_third", label: "Third copy", type: "select", required: true, options: COPY },
  {
    key: "kin_note",
    label: "A note on the entry after the giver's death",
    type: "textarea",
    rows: 2,
    hint: "Under the Ethics of Memory, kin are consulted. This is a note, never an automatic opening.",
  },
  {
    key: "published",
    label: "Published in the open catalogue",
    type: "checkbox",
    hint: "Shown only once it has a number.",
  },
];

function AccessionDetail({ accession }: { accession: AdminAccession }) {
  const { permissions } = useAuthorization();
  const isKeeper = permissions.includes("record.closed.read");
  const accessions = useAdminAccessions();
  const consent = useAdminConsentLines();
  const parts = useAdminParts();
  const closed = useAdminClosed(isKeeper);
  const assign = useAssignAccessionNumber();
  const addConsent = useAddConsentLine();
  const withdraw = useWithdrawAccession();
  const savePart = useSavePart();
  const listen = useRecordListening();
  const saveClosed = useSaveClosed();

  const id = accession.id as string;
  const lines = (consent.data ?? []).filter((c) => c.accession_id === id);
  const myParts = (parts.data ?? []).filter((p) => p.accession_id === id);
  const mine = (closed.data ?? []).find((c) => c.accession_id === id);
  const withdrawn = accession.withdrawn_on != null;
  const numberOf = new Map((accessions.data ?? []).map((a) => [a.id, a.number]));
  const idOfNumber = new Map((accessions.data ?? []).map((a) => [a.number, a.id]));

  const consentSpecs: FieldSpec[] = [
    {
      key: "kind",
      label: "What happened",
      type: "select",
      required: true,
      options: [
        { value: "asked", label: "The giver was asked" },
        { value: "agreed", label: "The giver agreed" },
        { value: "narrowed", label: "The giver narrowed what may be done" },
        { value: "note", label: "A note" },
      ],
    },
    {
      key: "line",
      label: "The line, dated and never changed",
      type: "textarea",
      rows: 2,
      required: true,
    },
    { key: "recorded_on", label: "Recorded on", type: "date", hint: "Today if left empty." },
  ];
  const partSpecs: FieldSpec[] = [
    {
      key: "part_no",
      label: "Part number",
      type: "number",
      required: true,
      hint: "Part 1 is always the consents and is made when the number is given.",
    },
    { key: "label", label: "What it is", type: "text", required: true },
    { key: "sha256", label: "SHA-256 fingerprint of the master", type: "text" },
    {
      key: "opened_online",
      label: "Opened online",
      type: "checkbox",
      hint: "Needs a fingerprint and a file path. The fingerprint is published beside the file, never for a part that is not opened.",
    },
    { key: "online_path", label: "Storage path of the file", type: "text" },
  ];
  const closedSpecs: FieldSpec[] = [
    { key: "giver", label: "The giver", type: "text" },
    { key: "witness", label: "The witness", type: "text" },
    { key: "family_reached", label: "How the family is reached", type: "textarea", rows: 2 },
    {
      key: "cross_refs",
      label: "Other accessions by the same giver",
      type: "text",
      hint: "Accession numbers, separated by commas.",
    },
  ];

  return (
    <div className="flex flex-col gap-8 border-t pt-6">
      <section className="flex flex-col gap-2" aria-labelledby="acc-number">
        <h2 id="acc-number" className="font-medium">
          Its number
        </h2>
        {accession.number ? (
          <p className="text-sm">{accession.number}. Never changed or reused.</p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              A number is given only after an agreement is on file.
            </p>
            <Button
              type="button"
              size="sm"
              loading={assign.isPending}
              onClick={() => assign.mutate({ p_id: id })}
              className="self-start"
            >
              Give it its number
            </Button>
            {assign.error != null && (
              <p role="alert" className="text-destructive text-sm">
                {assign.error.message}
              </p>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="acc-consent">
        <h2 id="acc-consent" className="font-medium">
          Consent, as it stands
        </h2>
        <ol className="flex flex-col gap-1 text-sm">
          {lines.map((c) => (
            <li key={c.id}>
              {c.recorded_on ? formatKathmanduDate(c.recorded_on) : ""} · {c.kind}: {c.line}
            </li>
          ))}
          {lines.length === 0 && <li className="text-muted-foreground">Nothing recorded yet.</li>}
        </ol>
        {!withdrawn && (
          <RecordForm
            specs={consentSpecs}
            initial={toValues(consentSpecs, null)}
            resetKey={`cl-${id}-${addConsent.submittedAt}`}
            submitLabel="Add the line"
            pending={addConsent.isPending}
            error={addConsent.error}
            onSubmit={(v) =>
              addConsent.mutate({
                p_accession: id,
                p_kind: v["kind"],
                p_line: s(v["line"]),
                p_on: s(v["recorded_on"]),
              })
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="acc-parts">
        <h2 id="acc-parts" className="font-medium">
          Parts
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {myParts.map((p) => (
            <li key={p.id}>
              {accession.number
                ? `${accession.number}.${String(p.part_no).padStart(2, "0")}`
                : `Part ${p.part_no}`}{" "}
              {p.label}
              {p.opened_online ? " · opened online" : ""}
            </li>
          ))}
          {myParts.length === 0 && <li className="text-muted-foreground">No part yet.</li>}
        </ul>
        {!withdrawn && accession.number && (
          <RecordForm
            specs={partSpecs}
            initial={{ ...toValues(partSpecs, null), part_no: String(myParts.length + 1) }}
            resetKey={`pt-${id}-${savePart.submittedAt}-${myParts.length}`}
            submitLabel="Add or update a part"
            pending={savePart.isPending}
            error={savePart.error}
            onSubmit={(v) => {
              const existing = myParts.find((p) => p.part_no === n(v["part_no"]));
              savePart.mutate({
                p: {
                  id: existing?.id ?? null,
                  accession_id: id,
                  part_no: n(v["part_no"]),
                  label: s(v["label"]),
                  sha256: s(v["sha256"]),
                  opened_online: v["opened_online"],
                  online_path: s(v["online_path"]),
                },
              });
            }}
          />
        )}
      </section>

      {!withdrawn && accession.number && (
        <section className="flex flex-col gap-2" aria-labelledby="acc-listen">
          <h2 id="acc-listen" className="font-medium">
            Listening
          </h2>
          <p className="text-muted-foreground text-sm">
            Heard {accession.listenings ?? 0} times. Names are kept for the period set in Settings
            (record.listening_names_days), then only the count remains.
          </p>
          <RecordForm
            specs={[{ key: "who", label: "Who listened", type: "text" }]}
            initial={{ who: "" }}
            resetKey={`ls-${id}-${listen.submittedAt}`}
            submitLabel="Record a listening"
            pending={listen.isPending}
            error={listen.error}
            onSubmit={(v) => listen.mutate({ p_accession: id, p_part: null, p_who: s(v["who"]) })}
          />
        </section>
      )}

      {isKeeper && (
        <section className="flex flex-col gap-3" aria-labelledby="acc-closed">
          <h2 id="acc-closed" className="font-medium">
            The closed layer
          </h2>
          <p className="text-muted-foreground text-sm">
            Only the Keeper sees this. It is never published and never in the public database.
          </p>
          <RecordForm
            specs={closedSpecs}
            initial={{
              giver: mine?.giver ?? "",
              witness: mine?.witness ?? "",
              family_reached: mine?.family_reached ?? "",
              cross_refs: (mine?.cross_refs ?? [])
                .map((r) => numberOf.get(r) ?? "")
                .filter(Boolean)
                .join(", "),
            }}
            resetKey={`cx-${id}-${saveClosed.submittedAt}-${mine?.updated_at ?? ""}`}
            submitLabel="Save the closed layer"
            pending={saveClosed.isPending}
            error={saveClosed.error}
            onSubmit={(v) =>
              saveClosed.mutate({
                p: {
                  accession_id: id,
                  giver: s(v["giver"]),
                  witness: s(v["witness"]),
                  family_reached: s(v["family_reached"]),
                  cross_refs: String(v["cross_refs"] ?? "")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((num) => idOfNumber.get(num))
                    .filter(Boolean),
                },
              })
            }
          />
        </section>
      )}

      {!withdrawn && (
        <section className="flex flex-col gap-2" aria-labelledby="acc-withdraw">
          <h2 id="acc-withdraw" className="font-medium">
            If the giver withdraws
          </h2>
          <p className="text-muted-foreground text-sm">
            The number stays as a numbered gap with no name, and the description is cleared. This
            cannot be undone.
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            loading={withdraw.isPending}
            className="self-start"
            onClick={() => {
              if (
                window.confirm(
                  "The giver has withdrawn this holding. Record it? This cannot be undone.",
                )
              ) {
                withdraw.mutate({ p_id: id, p_on: null });
              }
            }}
          >
            The giver has withdrawn
          </Button>
        </section>
      )}
    </div>
  );
}

export function AdminCataloguePage() {
  const rows = useAdminAccessions();
  const save = useSaveAccession();
  return (
    <CrudPage<AdminAccession>
      title="The catalogue"
      intro="What was given in to the Record. Consent for papers and photographs is still a spoken, witnessed asking; this screen only keeps what was agreed."
      addLabel="Add an accession"
      rows={rows.data}
      status={rows}
      specs={ACCESSION_SPECS}
      initial={(row, base) =>
        row
          ? base
          : {
              ...base,
              kind: "papers",
              listening_tier: "family_only",
              description_level: "none",
              copy_first: "not_yet",
              copy_second: "not_yet",
              copy_third: "not_yet",
            }
      }
      rowLabel={(r) => r.number ?? "No number yet"}
      rowDetail={(r) =>
        `${r.kind}${r.withdrawn_on ? " · withdrawn" : r.published ? "" : " · draft"}`
      }
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          kind: v["kind"],
          dates_from: s(v["dates_from"]),
          dates_to: s(v["dates_to"]),
          listening_tier: v["listening_tier"],
          description_level: v["description_level"],
          description: s(v["description"]),
          description_ne: s(v["description_ne"]),
          opens_on: s(v["opens_on"]),
          copy_first: v["copy_first"],
          copy_second: v["copy_second"],
          copy_third: v["copy_third"],
          kin_note: s(v["kin_note"]),
          published: v["published"],
        },
      })}
      mutation={save}
      extra={(a) => <AccessionDetail accession={a} />}
    />
  );
}

const HOUSE_PAPER_SPECS: FieldSpec[] = [
  {
    key: "reference",
    label: "Reference",
    type: "text",
    required: true,
    hint: "HP-0001 and on. The house's papers are numbered on their own, apart from the catalogue.",
  },
  { key: "title", label: "Title", type: "text", required: true },
  { key: "title_ne", label: "Title in Nepali", type: "text" },
  { key: "dated_on", label: "Dated", type: "date" },
  { key: "kind", label: "Kind", type: "text", hint: "A deed, minutes, a letter." },
  { key: "note", label: "A line about it", type: "textarea", rows: 3 },
  { key: "note_ne", label: "The same, in Nepali", type: "textarea", rows: 3 },
  { key: "published", label: "Published", type: "checkbox" },
];

export function AdminHousePapersPage() {
  const rows = useAdminHousePapers();
  const save = useSaveHousePaper();
  return (
    <CrudPage<AdminHousePaper>
      title="The house's papers"
      intro="The house's own record: its deeds, minutes and correspondence."
      addLabel="Add a paper"
      rows={rows.data}
      status={rows}
      specs={HOUSE_PAPER_SPECS}
      rowLabel={(r) => `${r.reference ?? ""} ${r.title ?? ""}`}
      rowDetail={(r) => (r.published ? "" : "draft")}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          reference: s(v["reference"]),
          title: s(v["title"]),
          title_ne: s(v["title_ne"]),
          dated_on: s(v["dated_on"]),
          kind: s(v["kind"]),
          note: s(v["note"]),
          note_ne: s(v["note_ne"]),
          published: v["published"],
        },
      })}
      mutation={save}
    />
  );
}
