import * as React from "react";
import { Button, Field, Input } from "@paz/ui";
import { toAppError } from "@paz/types";
import { processAndUpload, type ProcessedImage } from "./process-image";

export type UploadedPhoto = ProcessedImage & {
  alt: string;
  alt_ne: string | null;
  photographer: string;
};

/**
 * One photograph: the file is resized and stored, and the caller is handed
 * the finished description to save wherever it belongs (a room, a thing, a
 * place before and after). Every photograph records who made it and says in
 * words what is in it.
 */
export function PhotoUploader({
  folder,
  label,
  onUploaded,
  withNepaliAlt = false,
}: {
  /** Storage folder and file stem, for example `house/rooms/the-hall`. */
  folder: string;
  label: string;
  onUploaded: (photo: UploadedPhoto) => Promise<unknown> | void;
  withNepaliAlt?: boolean;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [alt, setAlt] = React.useState("");
  const [altNe, setAltNe] = React.useState("");
  const [photographer, setPhotographer] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [done, setDone] = React.useState(false);
  const id = React.useId();

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const image = await processAndUpload(file, `${folder}-${Date.now()}`);
      await onUploaded({
        ...image,
        alt: alt.trim(),
        alt_ne: altNe.trim() || null,
        photographer: photographer.trim(),
      });
      setDone(true);
      setFile(null);
      setAlt("");
      setAltNe("");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <Field label="Image file" htmlFor={`${id}-file`}>
        <input
          id={`${id}-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <Field label="Alt text" htmlFor={`${id}-alt`} hint="Describe what is in the picture.">
        <Input id={`${id}-alt`} value={alt} onChange={(e) => setAlt(e.target.value)} />
      </Field>
      {withNepaliAlt && (
        <Field label="Alt text in Nepali" htmlFor={`${id}-alt-ne`}>
          <Input
            id={`${id}-alt-ne`}
            lang="ne"
            value={altNe}
            onChange={(e) => setAltNe(e.target.value)}
          />
        </Field>
      )}
      <Field label="Photographer" htmlFor={`${id}-ph`} hint="Who made this photograph.">
        <Input
          id={`${id}-ph`}
          value={photographer}
          onChange={(e) => setPhotographer(e.target.value)}
        />
      </Field>
      {error != null && (
        <p role="alert" aria-live="assertive" className="text-destructive text-sm">
          {toAppError(error).message}
        </p>
      )}
      {done && (
        <p role="status" aria-live="polite" className="text-sm">
          Saved.
        </p>
      )}
      <Button
        type="button"
        loading={busy}
        disabled={!file || !alt.trim() || !photographer.trim()}
        onClick={() => void run()}
        className="self-start"
      >
        Upload
      </Button>
    </fieldset>
  );
}
