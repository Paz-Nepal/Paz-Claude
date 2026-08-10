// Staff media upload: MIME-sniffs the actual bytes (never trusts the
// browser's Content-Type), enforces per-category size caps, strips EXIF
// from images that can carry it, reads real pixel dimensions from the
// file header, then uploads the cleaned bytes and registers the row
// (Build Readiness Review D-8, T-041). Replaces the previous
// client-uploads-directly-to-storage path — the same
// publishing.media.create permission still gates both the storage write
// and api.register_media, now via the caller's own forwarded JWT rather
// than service_role, so nothing here escalates privilege.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  extensionFor,
  maxBytesFor,
  readDimensions,
  sniffMimeType,
  stripExif,
} from "../_shared/media-processing.ts";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected multipart/form-data", 400);
  }

  const file = form.get("file");
  const alt = form.get("alt");
  const credit = form.get("credit");

  if (!(file instanceof File)) return jsonError("A file is required", 400);
  if (typeof alt !== "string" || !alt.trim()) return jsonError("Alt text is required", 400);

  const bytes = new Uint8Array(await file.arrayBuffer());

  const sniffed = sniffMimeType(bytes);
  if (!sniffed) {
    return jsonError("Unrecognized file type — only JPEG, PNG, GIF, and PDF are accepted", 415);
  }

  const maxBytes = maxBytesFor(sniffed.category);
  if (bytes.length > maxBytes) {
    return jsonError(
      `File is too large (${(bytes.length / 1024 / 1024).toFixed(1)}MB, max ${(maxBytes / 1024 / 1024).toFixed(0)}MB)`,
      413,
    );
  }

  const cleaned = stripExif(bytes, sniffed.mimeType);
  const dimensions = readDimensions(cleaned, sniffed.mimeType);
  const storagePath = `original/${crypto.randomUUID()}.${extensionFor(sniffed.mimeType)}`;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, cleaned, { contentType: sniffed.mimeType, upsert: false });
  if (uploadError) {
    return jsonError(uploadError.message, 400);
  }

  const { data: mediaId, error: registerError } = await supabase
    .schema("api")
    .rpc("register_media", {
      p_storage_path: storagePath,
      p_mime_type: sniffed.mimeType,
      p_size_bytes: cleaned.length,
      p_width: dimensions?.width ?? null,
      p_height: dimensions?.height ?? null,
      p_alt: alt,
      p_credit: typeof credit === "string" && credit.trim() ? credit : null,
    });

  if (registerError) {
    // The object is already in storage but not registered — leave it for
    // the orphan report (D-8) rather than attempting a compensating
    // delete with a client that only has insert, not delete, on the
    // bucket (media_objects_insert_staff grants insert only).
    return jsonError(registerError.message, 400);
  }

  return new Response(JSON.stringify({ mediaId, storagePath }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
