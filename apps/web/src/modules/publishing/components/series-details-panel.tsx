import * as React from "react";
import { Button, Field, Input, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import {
  useUploadMedia,
  useSavePaperDetails,
  useSaveBriefDetails,
  useSaveDispatchDetails,
  useSavePigeonPostDetails,
  useSaveAnnualDetails,
  type ItemType,
} from "../api/use-publishing";

/** A single-file, non-image upload control (MediaPicker is image-only —
 * PDFs render nothing useful in its thumbnail grid). */
function PdfPicker({
  mediaId,
  onSelect,
}: {
  mediaId: string | null;
  onSelect: (id: string) => void;
}) {
  const upload = useUploadMedia();
  const fileInput = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      {mediaId && <p className="text-muted-foreground text-sm">A PDF is attached.</p>}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={upload.isPending}
        onClick={() => fileInput.current?.click()}
        className="self-start"
      >
        {mediaId ? "Replace PDF" : "Upload PDF"}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const alt = window.prompt("Describe this file (alt text, required):") ?? "";
          if (!alt) return;
          upload.mutate(
            { file, alt, credit: null },
            { onSuccess: (result) => onSelect(result.id) },
          );
        }}
      />
      {upload.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(upload.error).message}
        </p>
      )}
    </div>
  );
}

/** Every series' detail row, however it comes back from api.get_item's
 * jsonb `details` column. Optional/nullable throughout since a brand new
 * item of the type has no row here yet. */
export interface SeriesDetails {
  paper_no?: number | null;
  abstract?: string | null;
  pdf_media?: string | null;
  license?: string | null;
  sources_note?: string | null;
  issue_no?: number | null;
  issue_date?: string | null;
  edition_no?: string | null;
  year?: number | null;
  contents?: string | null;
  event_date?: string | null;
  location?: string | null;
}

export function SeriesDetailsPanel({
  type,
  itemId,
  details,
}: {
  type: ItemType;
  itemId: string;
  details: SeriesDetails | null;
}) {
  switch (type) {
    case "paper":
      return <PaperDetailsForm itemId={itemId} details={details} />;
    case "brief":
      return <BriefDetailsForm itemId={itemId} details={details} />;
    case "dispatch":
      return <DispatchDetailsForm itemId={itemId} details={details} />;
    case "pigeon_post":
      return <PigeonPostDetailsForm itemId={itemId} details={details} />;
    case "annual":
      return <AnnualDetailsForm itemId={itemId} details={details} />;
    default:
      return null;
  }
}

function PaperDetailsForm({ itemId, details }: { itemId: string; details: SeriesDetails | null }) {
  const [abstract, setAbstract] = React.useState(details?.abstract ?? "");
  const [license, setLicense] = React.useState(details?.license ?? "CC BY");
  const [sourcesNote, setSourcesNote] = React.useState(details?.sources_note ?? "");
  const [pdfMedia, setPdfMedia] = React.useState<string | null>(details?.pdf_media ?? null);
  const save = useSavePaperDetails();

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Paper details {details?.paper_no != null && `(No. ${details.paper_no})`}
        </span>
      </div>
      {/* No byline field here on purpose: the public page always reads "A
          Paz Paper", and Papers are never dated on the page (spec §2). */}
      <Field label="Abstract" htmlFor="paper-abstract">
        <Textarea
          id="paper-abstract"
          rows={2}
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
        />
      </Field>
      <Field label="License" htmlFor="paper-license">
        <select
          id="paper-license"
          className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-base"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
        >
          <option value="CC BY">CC BY</option>
          <option value="CC BY-SA">CC BY-SA</option>
        </select>
      </Field>
      <Field label="Sources note" htmlFor="paper-sources">
        <Textarea
          id="paper-sources"
          rows={2}
          value={sourcesNote}
          onChange={(e) => setSourcesNote(e.target.value)}
        />
      </Field>
      <Field label="Typeset PDF" htmlFor="paper-pdf">
        <PdfPicker mediaId={pdfMedia} onSelect={setPdfMedia} />
      </Field>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={save.isPending}
        className="self-start"
        onClick={() =>
          save.mutate({
            p_item: itemId,
            p_abstract: abstract || null,
            p_pdf_media: pdfMedia,
            p_license: license,
            p_sources_note: sourcesNote || null,
          })
        }
      >
        Save Paper details
      </Button>
    </div>
  );
}

function IssueDetailsForm({
  itemId,
  details,
  label,
  save,
}: {
  itemId: string;
  details: SeriesDetails | null;
  label: string;
  save: ReturnType<typeof useSaveBriefDetails>;
}) {
  const [issueDate, setIssueDate] = React.useState(details?.issue_date ?? "");

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <span className="text-sm font-medium">
        {label} details {details?.issue_no != null && `(No. ${details.issue_no})`}
      </span>
      <Field label="Issue date" htmlFor="issue-date">
        <Input
          id="issue-date"
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
        />
      </Field>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={save.isPending}
        className="self-start"
        onClick={() => save.mutate({ p_item: itemId, p_issue_date: issueDate || null })}
      >
        Save {label} details
      </Button>
    </div>
  );
}

function BriefDetailsForm(props: { itemId: string; details: SeriesDetails | null }) {
  const save = useSaveBriefDetails();
  return <IssueDetailsForm {...props} label="Brief" save={save} />;
}

function DispatchDetailsForm(props: { itemId: string; details: SeriesDetails | null }) {
  const save = useSaveDispatchDetails();
  return <IssueDetailsForm {...props} label="Dispatch" save={save} />;
}

/** No author/contributor field anywhere in this form -- there is no
 * parameter on api.save_pigeon_post_details to send one to (spec §2/§5:
 * Pigeon Post is anonymous on the page, permanently). */
function PigeonPostDetailsForm({
  itemId,
  details,
}: {
  itemId: string;
  details: SeriesDetails | null;
}) {
  const [editionNo, setEditionNo] = React.useState(details?.edition_no ?? "");
  const [pdfMedia, setPdfMedia] = React.useState<string | null>(details?.pdf_media ?? null);
  const save = useSavePigeonPostDetails();

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <span className="text-sm font-medium">Pigeon Post details</span>
      <Field label="Edition" htmlFor="pp-edition" hint="e.g. PP-0004">
        <Input id="pp-edition" value={editionNo} onChange={(e) => setEditionNo(e.target.value)} />
      </Field>
      <Field label="Keepsake PDF / scan" htmlFor="pp-pdf">
        <PdfPicker mediaId={pdfMedia} onSelect={setPdfMedia} />
      </Field>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={save.isPending}
        disabled={!editionNo.trim()}
        className="self-start"
        onClick={() =>
          save.mutate({ p_item: itemId, p_edition_no: editionNo, p_pdf_media: pdfMedia })
        }
      >
        Save Pigeon Post details
      </Button>
    </div>
  );
}

function AnnualDetailsForm({ itemId, details }: { itemId: string; details: SeriesDetails | null }) {
  const [year, setYear] = React.useState(details?.year?.toString() ?? "");
  const [contents, setContents] = React.useState(details?.contents ?? "");
  const [pdfMedia, setPdfMedia] = React.useState<string | null>(details?.pdf_media ?? null);
  const save = useSaveAnnualDetails();

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <span className="text-sm font-medium">Annual details</span>
      <Field label="Year" htmlFor="annual-year">
        <Input
          id="annual-year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </Field>
      <Field label="Contents" htmlFor="annual-contents">
        <Textarea
          id="annual-contents"
          rows={3}
          value={contents}
          onChange={(e) => setContents(e.target.value)}
        />
      </Field>
      <Field label="PDF" htmlFor="annual-pdf">
        <PdfPicker mediaId={pdfMedia} onSelect={setPdfMedia} />
      </Field>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={save.isPending}
        disabled={!year.trim()}
        className="self-start"
        onClick={() =>
          save.mutate({
            p_item: itemId,
            p_year: Number(year),
            p_contents: contents || null,
            p_pdf_media: pdfMedia,
          })
        }
      >
        Save Annual details
      </Button>
    </div>
  );
}
