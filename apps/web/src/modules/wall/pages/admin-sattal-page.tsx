import * as React from "react";
import { Badge, Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import {
  useAddSattalCorrection,
  useAdminPeople,
  useAdminReaders,
  useAdminSattal,
  useAdminWorks,
  usePublishSattalPiece,
  useSaveReader,
  useSattalLedger,
  useSaveSattalLedger,
  useSaveSattalPiece,
  type AdminSattalPiece,
} from "../api/use-wall-admin";
import {
  RecordForm,
  s,
  slugify,
  toValues,
  type FieldSpec,
  type Values,
} from "../components/record-form";

// ---------------------------------------------------------------------
// Body text <-> ProseMirror v1. Paragraphs are separated by a blank line.
// Source keys are written [[key]] inside a paragraph and set out in the
// margin from the sources list (one per line, "key: text").
// ---------------------------------------------------------------------
interface PmNode {
  type?: string;
  text?: string;
  content?: PmNode[];
}

function textToDoc(text: string) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}

function flat(node: PmNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(flat).join("");
}

function docToText(doc: unknown): string {
  const content = (doc as { content?: PmNode[] } | null)?.content;
  return Array.isArray(content) ? content.map(flat).join("\n\n") : "";
}

function sourcesToText(v: unknown): string {
  return Array.isArray(v)
    ? (v as Array<{ key: string; text: string }>).map((x) => `${x.key}: ${x.text}`).join("\n")
    : "";
}

function textToSources(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i < 0
        ? { key: l, text: "" }
        : { key: l.slice(0, i).trim(), text: l.slice(i + 1).trim() };
    });
}

function pieceSpecs(
  authors: Array<{ id: string | null; name: string | null }>,
  works: Array<{ id: string | null; title: string | null }>,
  people: Array<{ id: string | null; name: string | null }>,
  readers: Array<{ id: string | null; name: string | null }>,
  pieces: Array<{ id: string | null; title: string | null }>,
): FieldSpec[] {
  return [
    {
      key: "form",
      label: "Form",
      type: "select",
      required: true,
      options: [
        { value: "study", label: "Study (commissioned, evidenced)" },
        { value: "review", label: "Review (judgement plus grounds)" },
        { value: "account", label: "Account (having been there)" },
      ],
    },
    {
      key: "person_id",
      label: "Author",
      type: "select",
      required: true,
      options: authors.map((a) => ({ value: a.id as string, label: a.name as string })),
    },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "title_ne", label: "Title in Nepali", type: "text" },
    { key: "slug", label: "Address", type: "text", required: true },
    {
      key: "original_language",
      label: "Original language",
      type: "select",
      required: true,
      options: [
        { value: "en", label: "English" },
        { value: "ne", label: "Nepali" },
        { value: "new", label: "Nepal Bhasa" },
      ],
    },
    {
      key: "body",
      label: "English text",
      type: "textarea",
      rows: 12,
      hint: "A blank line between paragraphs. Write a source key as [[a]].",
    },
    {
      key: "body_ne",
      label: "Nepali text (set beside the English)",
      type: "textarea",
      rows: 12,
      hint: "The house pays for the translation. Paragraph for paragraph.",
    },
    {
      key: "commissioned_on",
      label: "Commissioned on",
      type: "date",
      hint: "A Study is commissioned, and the commission is recorded before it can be published.",
    },
    { key: "commissioned_note", label: "Commission note", type: "text" },
    {
      key: "agreement_signed_on",
      label: "Author agreement signed on",
      type: "date",
      hint: "Recorded against each piece. A piece cannot be published without it.",
    },
    { key: "agreement_note", label: "Agreement reference", type: "text" },
    {
      key: "sources",
      label: "Source keys",
      type: "textarea",
      rows: 4,
      hint: "One per line: a: the source.",
    },
    {
      key: "relation_declaration",
      label: "The author's relation to the subject",
      type: "textarea",
      rows: 2,
      required: true,
      hint: "Required. Never empty.",
    },
    {
      key: "subject_work_id",
      label: "About a work",
      type: "select",
      options: works.map((w) => ({ value: w.id as string, label: w.title as string })),
    },
    {
      key: "subject_person_id",
      label: "About a person",
      type: "select",
      options: people.map((p) => ({ value: p.id as string, label: p.name as string })),
    },
    { key: "about_house", label: "About PAZ itself", type: "checkbox" },
    {
      key: "author_connected",
      label: "The author is connected to the subject",
      type: "checkbox",
      hint: "Presumed until someone has attested otherwise. Untick only when true.",
    },
    {
      key: "outside_reader_id",
      label: "Outside reader",
      type: "select",
      options: readers.map((r) => ({ value: r.id as string, label: r.name as string })),
    },
    { key: "reader_accepted_on", label: "Accepted by the reader on", type: "date" },
    {
      key: "reply_to_piece_id",
      label: "A reply to",
      type: "select",
      options: pieces.map((p) => ({ value: p.id as string, label: p.title as string })),
      hint: "A reply is a signed, numbered piece. There is no comment box.",
    },
  ];
}

function initialFor(specs: FieldSpec[], p: AdminSattalPiece | null): Values {
  return {
    ...toValues(specs, p),
    body: docToText(p?.body),
    body_ne: docToText(p?.body_ne),
    sources: sourcesToText(p?.sources),
    original_language: p?.original_language ?? "en",
    author_connected: p ? Boolean(p.author_connected) : true,
  };
}

export function AdminSattalPage() {
  const pieces = useAdminSattal();
  const people = useAdminPeople();
  const works = useAdminWorks();
  const readers = useAdminReaders();
  const save = useSaveSattalPiece();
  const publish = usePublishSattalPiece();
  const [editing, setEditing] = React.useState<AdminSattalPiece | null>(null);
  const [isNew, setIsNew] = React.useState(false);

  const authors = (people.data ?? []).filter((p) => (p.roles ?? []).includes("author"));
  const specs = React.useMemo(
    () =>
      pieceSpecs(
        authors,
        works.data ?? [],
        people.data ?? [],
        readers.data ?? [],
        (pieces.data ?? []).filter((x) => x.status === "published"),
      ),
    [people.data, works.data, readers.data, pieces.data], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const showForm = isNew || editing != null;
  const locked = editing?.status === "published";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">The Sattal</h1>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsNew(true);
          }}
        >
          New piece
        </Button>
      </div>

      <Readers />

      {pieces.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {pieces.isError && (
        <StatePanel title="Couldn't load pieces." description={toAppError(pieces.error).message} />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <ul className="flex flex-col gap-2">
          {(pieces.data ?? []).map((x) => (
            <li key={x.id}>
              <button
                type="button"
                className="hover:bg-muted w-full rounded-md border p-3 text-left"
                onClick={() => {
                  setIsNew(false);
                  setEditing(x);
                }}
              >
                <span className="font-medium">{x.title}</span>
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  {x.person_name} · {x.form}
                  <Badge variant={x.status === "published" ? "default" : "outline"}>
                    {x.status}
                  </Badge>
                  {x.house_connected && <Badge variant="outline">needs an outside reader</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {showForm && (
          <div className="flex flex-col gap-6">
            {locked ? (
              <Published piece={editing} />
            ) : (
              <>
                <RecordForm
                  specs={specs}
                  initial={initialFor(specs, editing)}
                  resetKey={editing?.id ?? "new"}
                  submitLabel={editing ? "Save draft" : "Add draft"}
                  pending={save.isPending}
                  error={save.error}
                  onSubmit={(v) => {
                    const ne = String(v["body_ne"] ?? "").trim();
                    save.mutate(
                      {
                        p: {
                          id: editing?.id ?? null,
                          slug: s(v["slug"]) ?? slugify(String(v["title"])),
                          form: v["form"],
                          person_id: s(v["person_id"]),
                          title: s(v["title"]),
                          title_ne: s(v["title_ne"]),
                          body: textToDoc(String(v["body"] ?? "")),
                          body_ne: ne ? textToDoc(ne) : null,
                          sources: textToSources(String(v["sources"] ?? "")),
                          original_language: v["original_language"],
                          relation_declaration: s(v["relation_declaration"]),
                          subject_work_id: s(v["subject_work_id"]),
                          subject_person_id: s(v["subject_person_id"]),
                          about_house: v["about_house"],
                          author_connected: v["author_connected"],
                          outside_reader_id: s(v["outside_reader_id"]),
                          reader_accepted_on: s(v["reader_accepted_on"]),
                          reply_to_piece_id: s(v["reply_to_piece_id"]),
                          commissioned_on: s(v["commissioned_on"]),
                          commissioned_note: s(v["commissioned_note"]),
                          agreement_signed_on: s(v["agreement_signed_on"]),
                          agreement_note: s(v["agreement_note"]),
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
                {editing && (
                  <div className="flex flex-col gap-2 border-t pt-4">
                    <p className="text-muted-foreground text-sm">
                      Publishing goes out the day it is accepted. There are no issues and no
                      schedule. If the piece is about work the house shows, sells or has formed, or
                      about PAZ, the database refuses to publish it without an accepting outside
                      reader and an unconnected author.
                    </p>
                    {publish.error != null && (
                      <p role="alert" aria-live="assertive" className="text-destructive text-sm">
                        {toAppError(publish.error).message}
                      </p>
                    )}
                    <Button
                      type="button"
                      loading={publish.isPending}
                      className="self-start"
                      onClick={() =>
                        publish.mutate(
                          { p_id: editing.id },
                          {
                            onSuccess: () => {
                              setEditing(null);
                            },
                          },
                        )
                      }
                    >
                      Publish
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Published({ piece }: { piece: AdminSattalPiece }) {
  const add = useAddSattalCorrection();
  const specs: FieldSpec[] = [
    { key: "note", label: "Correction", type: "textarea", rows: 3, required: true },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Published as {piece.deposit_ref}, piece no. {piece.piece_number}. A published piece is never
        rewritten. A correction is added.
      </p>
      <Ledger pieceId={piece.id as string} />
      <RecordForm
        specs={specs}
        initial={toValues(specs, null)}
        resetKey={`c-${piece.id}-${add.submittedAt}`}
        submitLabel="Add correction"
        pending={add.isPending}
        error={add.error}
        onSubmit={(v) => add.mutate({ p_piece: piece.id, p_note: s(v["note"]) })}
      />
    </div>
  );
}

function Readers() {
  const readers = useAdminReaders();
  const save = useSaveReader();
  const specs: FieldSpec[] = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "note", label: "Note", type: "text" },
  ];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="adm-readers">
      <h2 id="adm-readers" className="font-medium">
        Outside readers
      </h2>
      <p className="text-muted-foreground text-sm">
        A named reader the house cannot overrule. Until one exists the Sattal publishes nothing
        about work the house shows, sells or has formed, or about PAZ, and the front page says so.
      </p>
      <ul className="text-sm">
        {(readers.data ?? []).map((r) => (
          <li key={r.id}>
            {r.name}
            {r.note ? `. ${r.note}` : ""}
          </li>
        ))}
        {readers.data && readers.data.length === 0 && <li>None named yet.</li>}
      </ul>
      <RecordForm
        specs={specs}
        initial={toValues(specs, null)}
        resetKey={`rd-${save.submittedAt}`}
        submitLabel="Name a reader"
        pending={save.isPending}
        error={save.error}
        onSubmit={(v) => save.mutate({ p: { name: s(v["name"]), note: s(v["note"]) } })}
      />
    </section>
  );
}

/** Acceptance and payment are separate facts with separate dates: paying on
 * acceptance is a promise, so it has an audit trail of its own. */
function Ledger({ pieceId }: { pieceId: string }) {
  const ledger = useSattalLedger();
  const save = useSaveSattalLedger();
  const mine = (ledger.data ?? []).find((l) => l.piece_id === pieceId);
  const specs: FieldSpec[] = [
    { key: "rate", label: "Rate (NPR)", type: "number", required: true },
    { key: "accepted_on", label: "Accepted on", type: "date" },
    { key: "paid_on", label: "Paid on", type: "date" },
    { key: "payment_ref", label: "Payment reference", type: "text" },
  ];
  return (
    <section className="flex flex-col gap-2" aria-labelledby={`ledger-${pieceId}`}>
      <h3 id={`ledger-${pieceId}`} className="font-medium">
        Rate ledger (private)
      </h3>
      <RecordForm
        specs={specs}
        initial={{
          rate: mine?.rate_minor == null ? "" : String(mine.rate_minor / 100),
          accepted_on: mine?.accepted_on ?? "",
          paid_on: mine?.paid_on ?? "",
          payment_ref: mine?.payment_ref ?? "",
        }}
        resetKey={`l-${pieceId}-${ledger.dataUpdatedAt}`}
        submitLabel="Save the ledger line"
        pending={save.isPending}
        error={save.error}
        onSubmit={(v) =>
          save.mutate({
            p: {
              piece_id: pieceId,
              rate_minor: Math.round(Number(v["rate"]) * 100),
              accepted_on: s(v["accepted_on"]),
              paid_on: s(v["paid_on"]),
              payment_ref: s(v["payment_ref"]),
            },
          })
        }
      />
    </section>
  );
}
