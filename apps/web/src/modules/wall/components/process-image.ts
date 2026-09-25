import { toAppError } from "@paz/types";
import { supabase } from "@/lib/supabase";

const WIDTHS = [480, 960, 1600];

export interface ImageVariantEntry {
  w: number;
  h: number;
  webp?: string;
  jpg?: string;
}

export interface ProcessedImage {
  original_path: string;
  width: number;
  height: number;
  variants: ImageVariantEntry[];
}

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
 * a slow connection is never sent a 6000 pixel file. `base` is the storage
 * path prefix, for example `house/rooms/the-hall-1712345678`.
 */
export async function processAndUpload(file: File, base: string): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const originalPath = `${base}-original.${ext}`;
  await upload(originalPath, file, file.type || "image/jpeg");

  const widths = WIDTHS.filter((w) => w < bitmap.width);
  if (widths.length === 0) widths.push(bitmap.width);
  const variants: ImageVariantEntry[] = [];
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
    const entry: ImageVariantEntry = { w, h };
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

  return { original_path: originalPath, width: bitmap.width, height: bitmap.height, variants };
}
