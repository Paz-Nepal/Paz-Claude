import * as React from "react";
import { Button, Field, Input } from "@paz/ui";
import { toAppError } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { useSaveWorkImage } from "../api/use-wall-admin";

const WIDTHS = [480, 960, 1600];

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function upload(path: string, blob: Blob | File, contentType: string) {
  const { error } = await supabase.storage
    .from("media")
    .upload(path, blob, { contentType, upsert: false });
  if (error) throw toAppError(error);
}

/**
 * Serves images responsibly (Build Specification 6.9): the original is kept
 * for a full-resolution view on request, and several sizes are made here in
 * the browser, each as WebP with a JPEG fallback, so a reader on a phone on
 * a slow connection is never sent a 6000 pixel file. Every image records
 * who photographed it.
 */
export function ImageUploader({
  workId,
  workSlug,
  frame,
  label,
}: {
  workId: string;
  workSlug: string;
  frame: "whole" | "detail" | "scale";
  label: string;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [alt, setAlt] = React.useState("");
  const [photographer, setPhotographer] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [done, setDone] = React.useState(false);
  const save = useSaveWorkImage();

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const bitmap = await createImageBitmap(file);
      const stamp = Date.now();
      const base = `wall/${workSlug}/${frame}-${stamp}`;
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const originalPath = `${base}-original.${ext}`;
      await upload(originalPath, file, file.type || "image/jpeg");

      const widths = WIDTHS.filter((w) => w < bitmap.width);
      if (widths.length === 0) widths.push(bitmap.width);
      const variants: Array<{ w: number; h: number; webp?: string; jpg?: string }> = [];
      for (const w of widths) {
        const h = Math.round((bitmap.height * w) / bitmap.width);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("This browser cannot resize images.");
        ctx.drawImage(bitmap, 0, 0, w, h);
        const webp = await toBlob(canvas, "image/webp", 0.85);
        const jpg = await toBlob(canvas, "image/jpeg", 0.88);
        const entry: { w: number; h: number; webp?: string; jpg?: string } = { w, h };
        if (webp && webp.type === "image/webp") {
          const p = `${base}-${w}.webp`;
          await upload(p, webp, "image/webp");
          entry.webp = p;
        }
        if (jpg) {
          const p = `${base}-${w}.jpg`;
          await upload(p, jpg, "image/jpeg");
          entry.jpg = p;
        }
        variants.push(entry);
      }

      await save.mutateAsync({
        p: {
          work_id: workId,
          frame,
          original_path: originalPath,
          width: bitmap.width,
          height: bitmap.height,
          variants,
          alt: alt.trim(),
          photographer: photographer.trim(),
        },
      });
      setDone(true);
      setFile(null);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <Field label="Image file" htmlFor={`img-${frame}`}>
        <input
          id={`img-${frame}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <Field label="Alt text" htmlFor={`alt-${frame}`} hint="Describe what is in the frame.">
        <Input id={`alt-${frame}`} value={alt} onChange={(e) => setAlt(e.target.value)} />
      </Field>
      <Field label="Photographer" htmlFor={`ph-${frame}`} hint="Who made this photograph.">
        <Input
          id={`ph-${frame}`}
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
        Upload {frame}
      </Button>
    </fieldset>
  );
}
