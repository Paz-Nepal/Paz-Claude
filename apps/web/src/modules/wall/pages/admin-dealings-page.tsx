import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatDimensions, formatKathmanduDate, formatMoney } from "@paz/utils";
import {
  useAdminDealings,
  useAdminPeople,
  useAdminWorks,
  useRecordDealingStage,
  useSaveDealing,
  useSaveWorkTerms,
  useWorkParts,
  useWorkTermsRows,
  type AdminDealing,
} from "../api/use-wall-admin";
import { CrudPage } from "../components/crud-page";
import { RecordForm, money, s, type FieldSpec } from "../components/record-form";
import { Mark } from "@/modules/site/components/mark";

const STAGES = ["quoted", "accepted", "invoiced", "dispatched", "arrived", "closed", "lapsed"];

/**
 * Enquiry to delivery (Build Programme 7). An enquiry against a work is
 * answered by a person. A quote itemises price, framing or rolling,
 * shipping and customs. Acceptance is the sale; the invoice is where the
 * company's name appears and nowhere else; dispatch carries a customs
 * description that never understates value; arrival is recorded against
 * the work's life.
 */
export function AdminDealingsPage() {
  const rows = useAdminDealings();
  const works = useAdminWorks();
  const save = useSaveDealing();
  const stage = useRecordDealingStage();
  const [on, setOn] = React.useState(new Date().toISOString().slice(0, 10));

  const specs: FieldSpec[] = [
    {
      key: "work_id",
      label: "Work",
      type: "select",
      required: true,
      options: (works.data ?? []).map((w) => ({
        value: w.id as string,
        label: `No. ${w.work_number}, ${w.title}`,
      })),
    },
    { key: "buyer_name", label: "Buyer", type: "text", required: true },
    { key: "buyer_email", label: "Buyer's email", type: "text" },
    { key: "buyer_country", label: "Country", type: "text" },
    { key: "q_price", label: "Agreed price (NPR)", type: "number" },
    { key: "q_framing", label: "Framing or rolling (NPR)", type: "number" },
    { key: "q_shipping", label: "Shipping (NPR)", type: "number" },
    { key: "q_customs", label: "Customs and duties (NPR)", type: "number" },
    {
      key: "q_notes",
      label: "Condition, framing, stretched or rolled, notes",
      type: "textarea",
      rows: 3,
    },
    {
      key: "customs_description",
      label: "Customs description",
      type: "textarea",
      rows: 2,
      hint: "Describe the work truthfully.",
    },
    {
      key: "declared_value",
      label: "Declared value (NPR)",
      type: "number",
      hint: "Never below the agreed price. The database refuses an understated value.",
    },
    { key: "carrier", label: "Carrier", type: "text" },
    { key: "tracking", label: "Tracking", type: "text" },
    { key: "notes", label: "Notes", type: "textarea", rows: 2 },
  ];

  return (
    <CrudPage<AdminDealing>
      title="Dealings"
      intro="Enquiry to delivery. Accepting a dealing marks the work sold; dispatch and arrival are added to the work's life."
      addLabel="Start a dealing"
      rows={rows.data}
      status={rows}
      specs={specs}
      rowLabel={(r) => `No. ${r.work_number}, ${r.work_title}: ${r.buyer_name}`}
      rowDetail={(r) => `${r.stage}${r.invoice_no ? ` · ${r.invoice_no}` : ""}`}
      initial={(r, base) => {
        const q = (r?.quote ?? {}) as Record<string, number | string>;
        const rs = (v: unknown) => (typeof v === "number" ? String(v / 100) : "");
        return {
          ...base,
          q_price: rs(q["price_minor"]),
          q_framing: rs(q["framing_minor"]),
          q_shipping: rs(q["shipping_minor"]),
          q_customs: rs(q["customs_minor"]),
          q_notes: typeof q["notes"] === "string" ? q["notes"] : "",
          declared_value:
            r?.declared_value_minor == null ? "" : String(r.declared_value_minor / 100),
        };
      }}
      toPayload={(v, r) => ({
        p: {
          id: r?.id ?? null,
          work_id: s(v["work_id"]) ?? r?.work_id,
          buyer_name: s(v["buyer_name"]),
          buyer_email: s(v["buyer_email"]),
          buyer_country: s(v["buyer_country"]),
          quote: {
            price_minor: money(v["q_price"]),
            framing_minor: money(v["q_framing"]),
            shipping_minor: money(v["q_shipping"]),
            customs_minor: money(v["q_customs"]),
            notes: s(v["q_notes"]),
          },
          customs_description: s(v["customs_description"]),
          declared_value_minor: money(v["declared_value"]),
          carrier: s(v["carrier"]),
          tracking: s(v["tracking"]),
          notes: s(v["notes"]),
        },
      })}
      mutation={save}
      extra={(r) => (
        <div className="flex flex-col gap-3 border-t pt-6">
          <h2 className="font-medium">Stage: {r.stage}</h2>
          <Field label="Date of the step" htmlFor="stage-on">
            <Input id="stage-on" type="date" value={on} onChange={(e) => setOn(e.target.value)} />
          </Field>
          {stage.error != null && (
            <p role="alert" aria-live="assertive" className="text-destructive text-sm">
              {toAppError(stage.error).message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {STAGES.map((st) => (
              <Button
                key={st}
                type="button"
                size="sm"
                variant="ghost"
                loading={stage.isPending}
                onClick={() => stage.mutate({ p_id: r.id, p_stage: st, p_on: on })}
              >
                {st}
              </Button>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            {r.invoice_no && (
              <Link className="underline" to={`/admin/wall/invoice/${r.id}`}>
                Print the invoice
              </Link>
            )}
            <Link className="underline" to={`/admin/wall/certificate/${r.work_id}`}>
              Print the certificate
            </Link>
          </div>
        </div>
      )}
    />
  );
}

/** Agreements and the split against a work, published or not. */
export function WorkTermsForm({ workId }: { workId: string }) {
  const terms = useWorkTermsRows();
  const save = useSaveWorkTerms();
  const mine = (terms.data ?? []).find((t) => t.work_id === workId);
  const specs: FieldSpec[] = [
    {
      key: "agreement_kind",
      label: "Agreement",
      type: "select",
      options: [
        { value: "consignment", label: "Consignment" },
        { value: "representation", label: "Representation" },
        { value: "own", label: "The house's own" },
      ],
    },
    { key: "agreement_ref", label: "Agreement reference", type: "text" },
    { key: "agreed_on", label: "Agreed on", type: "date" },
    {
      key: "house_split_note",
      label: "Split (private)",
      type: "textarea",
      rows: 2,
      hint: "Recorded against every work. Whether it is published is undecided, so it is never shown.",
    },
  ];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="adm-work-terms">
      <h2 id="adm-work-terms" className="font-medium">
        Agreement and split (private)
      </h2>
      <RecordForm
        specs={specs}
        initial={{
          agreement_kind: mine?.agreement_kind ?? "",
          agreement_ref: mine?.agreement_ref ?? "",
          agreed_on: mine?.agreed_on ?? "",
          house_split_note: mine?.house_split_note ?? "",
        }}
        resetKey={`wt-${workId}-${terms.dataUpdatedAt}`}
        submitLabel="Save"
        pending={save.isPending}
        error={save.error}
        onSubmit={(v) =>
          save.mutate({
            p: {
              work_id: workId,
              agreement_kind: s(v["agreement_kind"]),
              agreement_ref: s(v["agreement_ref"]),
              agreed_on: s(v["agreed_on"]),
              house_split_note: s(v["house_split_note"]),
            },
          })
        }
      />
    </section>
  );
}

// ---------------------------------------------------------------------
// Print pages. Every work sold leaves with a printed provenance document:
// what it is, who made it, when, its number, the struck row if it carries
// one, and its life to date.
// ---------------------------------------------------------------------
export function CertificatePage() {
  const { workId } = useParams<{ workId: string }>();
  const works = useAdminWorks();
  const parts = useWorkParts(workId);
  const people = useAdminPeople();
  const w = (works.data ?? []).find((x) => x.id === workId);
  if (works.isPending) return <p role="status">Loading…</p>;
  if (!w) return <StatePanel title="No such work." description="" />;
  const maker = (people.data ?? []).find((p) => p.id === w.person_id);
  const dims = formatDimensions(w.height_mm, w.width_mm, w.depth_mm);
  return (
    <article className="print-sheet mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <Button type="button" className="self-start print:hidden" onClick={() => window.print()}>
        Print
      </Button>
      <Mark size={48} />
      <p className="type-caption">Provenance</p>
      <h1 className="font-serif text-3xl">{w.title}</h1>
      <p>
        {maker?.name ?? w.person_name}
        {w.year ? `, ${w.year}` : ""}
      </p>
      <p>{[w.medium, dims].filter(Boolean).join(". ")}</p>
      <p>Work no. {w.work_number}</p>
      {w.hallmarked && (
        <p>
          This work carries the struck row: the house&rsquo;s punch beside the maker&rsquo;s own
          punch and a year letter. The punch attests formation, not quality, ownership or
          endorsement.
        </p>
      )}
      <h2 className="font-serif text-xl">Its life to date</h2>
      <ol className="flex flex-col gap-1">
        {(parts.data?.events ?? []).map((e) => (
          <li key={e.id}>
            {e.occurred_on ? formatKathmanduDate(e.occurred_on) : ""} · {e.kind}
            {e.note ? `. ${e.note}` : ""}
          </li>
        ))}
      </ol>
      <p className="text-sm">PAZ, Patan, Lalitpur</p>
    </article>
  );
}

export function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const rows = useAdminDealings();
  const d = (rows.data ?? []).find((x) => x.id === id);
  if (rows.isPending) return <p role="status">Loading…</p>;
  if (!d) return <StatePanel title="No such dealing." description="" />;
  const q = (d.quote ?? {}) as Record<string, number | string>;
  const lines: Array<[string, number | undefined]> = [
    ["Work", q["price_minor"] as number | undefined],
    ["Framing or rolling", q["framing_minor"] as number | undefined],
    ["Shipping", q["shipping_minor"] as number | undefined],
    ["Customs and duties", q["customs_minor"] as number | undefined],
  ];
  const total = lines.reduce((sum, [, v]) => sum + (v ?? 0), 0);
  return (
    <article className="print-sheet mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <Button type="button" className="self-start print:hidden" onClick={() => window.print()}>
        Print
      </Button>
      {/* The one place the company's name is printed: the invoice. */}
      <h1 className="font-serif text-2xl">PAZ MODERN PVT LTD</h1>
      <p>
        Invoice {d.invoice_no}
        {d.invoiced_on ? ` · ${formatKathmanduDate(d.invoiced_on)}` : ""}
      </p>
      <p>
        To {d.buyer_name}
        {d.buyer_country ? `, ${d.buyer_country}` : ""}
      </p>
      <p>
        No. {d.work_number}, {d.work_title}, {d.person_name}
      </p>
      <table className="w-full text-left">
        <tbody>
          {lines
            .filter(([, v]) => v != null)
            .map(([label, v]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="text-right">{formatMoney(v as number)}</td>
              </tr>
            ))}
          <tr className="font-semibold">
            <td>Total</td>
            <td className="text-right">{formatMoney(total)}</td>
          </tr>
        </tbody>
      </table>
      {d.customs_description && (
        <p className="text-sm">
          Customs description: {d.customs_description}
          {d.declared_value_minor != null
            ? `. Declared value ${formatMoney(d.declared_value_minor)}.`
            : ""}
        </p>
      )}
    </article>
  );
}
