import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useAdminGlossary, useSaveGlossaryTerm, useVoiceIntake } from "../api/use-wall-admin";
import { RecordForm, s, slugify, toValues, type FieldSpec } from "../components/record-form";

/**
 * The private intake behind /a-voice. Visible only to authenticated staff
 * holding crm.voice.read. It is an intake and never a directory: nothing
 * here is published, listed, indexed or searchable.
 */
export function AdminVoicePage() {
  const rows = useVoiceIntake();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">A voice: private intake</h1>
      <p className="text-muted-foreground text-sm">
        The house is not recording yet. This is a map of who is there, kept private.
      </p>
      {rows.isPending && <p className="text-muted-foreground">Loading…</p>}
      {rows.isError && (
        <StatePanel
          title="Couldn't load the intake."
          description={toAppError(rows.error).message}
        />
      )}
      {rows.data && rows.data.length === 0 && <StatePanel title="Nothing yet." description="" />}
      <ul className="flex flex-col gap-3">
        {(rows.data ?? []).map((r) => (
          <li key={r.id} className="rounded-lg border p-4 text-sm">
            <p className="font-medium">
              {r.writer_name} · {r.contact}
            </p>
            {(r.about_name || r.place) && (
              <p>
                About: {r.about_name ?? ""}
                {r.place ? ` · ${r.place}` : ""}
              </p>
            )}
            {r.note && <p className="whitespace-pre-line">{r.note}</p>}
            <p className="text-muted-foreground">
              {r.submitted_at ? formatKathmanduDate(r.submitted_at) : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TERM_SPECS: FieldSpec[] = [
  { key: "term", label: "Word", type: "text", required: true },
  { key: "term_ne", label: "Word in Nepali", type: "text" },
  { key: "slug", label: "Address", type: "text", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: [
      { value: "term", label: "Term" },
      { value: "spelling", label: "Spelling" },
    ],
  },
  { key: "definition", label: "Meaning", type: "textarea", required: true, rows: 3 },
  { key: "definition_ne", label: "Meaning in Nepali", type: "textarea", rows: 3 },
];

/** The shared lexicon and the spelling list's public face (/words). */
export function AdminGlossaryPage() {
  const terms = useAdminGlossary();
  const save = useSaveGlossaryTerm();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Words</h1>
      <p className="text-muted-foreground text-sm">
        Newari and Nepali words are set in plain Latin, no diacritics, no italics. Spelling follows
        pronunciation where the word is used: hiti, not hiṭi.
      </p>
      <RecordForm
        specs={TERM_SPECS}
        initial={{ ...toValues(TERM_SPECS, null), kind: "term" }}
        resetKey={`t-${save.submittedAt}`}
        submitLabel="Save word"
        pending={save.isPending}
        error={save.error}
        onSubmit={(v) =>
          save.mutate({
            p: {
              slug: s(v["slug"]) ?? slugify(String(v["term"])),
              kind: v["kind"],
              term: s(v["term"]),
              term_ne: s(v["term_ne"]),
              definition: s(v["definition"]),
              definition_ne: s(v["definition_ne"]),
            },
          })
        }
      />
      <ul className="flex flex-col gap-2 text-sm">
        {(terms.data ?? []).map((t) => (
          <li key={t.id}>
            <span className="font-medium">{t.term}</span>
            <span className="text-muted-foreground"> · {t.kind}</span>: {t.definition}
          </li>
        ))}
      </ul>
    </div>
  );
}
