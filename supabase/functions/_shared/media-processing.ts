// Pure, dependency-free byte-level media handling for ingest-media
// (Build Readiness Review D-8). Deliberately does not pull in an image
// codec: MIME is verified by magic bytes (not the browser-reported
// Content-Type, which is trivially spoofable) rather than decoded, EXIF
// is stripped by removing the metadata segment/chunk without touching
// pixel data, and dimensions are read from format headers. This covers
// the concrete privacy risk (EXIF GPS leaking a photographer's location)
// and the concrete security risk (uploading a mislabeled file) without a
// wasm/native dependency this repo has no way to load-test.
//
// NOT covered here, deliberately: full pixel re-encoding and multi-width
// variant generation (D-8's "Supabase Image Transformations vs on-ingest
// generation" spike, T-021) and WEBP dimension parsing (VP8L's bit-packed
// header is easy to get subtly wrong without real files to test against;
// left absent rather than shipped unverified — same "no placeholder
// architecture, no unverifiable architecture either" standard the rest of
// this repo holds to).

export type MediaCategory = "image" | "document";

export interface SniffedType {
  mimeType: string;
  category: MediaCategory;
}

const SIGNATURES: Array<{ mimeType: string; category: MediaCategory; magic: number[] }> = [
  { mimeType: "image/jpeg", category: "image", magic: [0xff, 0xd8, 0xff] },
  {
    mimeType: "image/png",
    category: "image",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mimeType: "image/gif", category: "image", magic: [0x47, 0x49, 0x46, 0x38] },
  { mimeType: "application/pdf", category: "document", magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },
];

function matches(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((byte, i) => bytes[i] === byte);
}

/**
 * Identifies a file by its magic bytes. Returns null for anything not on
 * the allow-list — an unrecognized upload is rejected, never guessed at.
 * WEBP ("RIFF"...."WEBP") is deliberately not included: sniffing it is
 * trivial (bytes 0-3 "RIFF", 8-11 "WEBP") but there'd be no way to strip
 * its metadata or read its dimensions below, and accepting a type this
 * function can't otherwise process would be worse than not accepting it.
 */
export function sniffMimeType(bytes: Uint8Array): SniffedType | null {
  for (const sig of SIGNATURES) {
    if (matches(bytes, sig.magic)) {
      return { mimeType: sig.mimeType, category: sig.category };
    }
  }
  return null;
}

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export function maxBytesFor(category: MediaCategory): number {
  return category === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
}

/**
 * Removes JPEG APP1 segments whose payload starts with the EXIF marker
 * ("Exif\0\0") -- this is where GPS tags (and everything else EXIF) live.
 * Walks marker segments from byte 2 (past the SOI marker FFD8) and copies
 * everything through unchanged until it reaches SOS (FFDA) or an
 * unrecognized byte, at which point the remainder (compressed scan data)
 * is copied verbatim without further parsing -- scan data can contain
 * arbitrary FF bytes and must never be touched by segment-level logic.
 */
export function stripJpegExif(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes; // not a JPEG we recognize; leave untouched
  }

  const out: number[] = [bytes[0], bytes[1]];
  let i = 2;

  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break; // no longer looking at a marker; bail out safely
    const marker = bytes[i + 1];

    if (marker === 0xd8 || marker === 0xd9) {
      // SOI/EOI carry no length field
      out.push(bytes[i], bytes[i + 1]);
      i += 2;
      continue;
    }
    if (marker === 0xda) {
      // Start of Scan: everything after this is compressed image data,
      // not further segments -- copy the rest untouched and stop.
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
      return Uint8Array.from(out);
    }

    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const segmentEnd = i + 2 + length;
    if (length < 2 || segmentEnd > bytes.length) break; // malformed; stop rather than guess

    const isExifApp1 =
      marker === 0xe1 &&
      length >= 8 &&
      bytes[i + 4] === 0x45 && // E
      bytes[i + 5] === 0x78 && // x
      bytes[i + 6] === 0x69 && // i
      bytes[i + 7] === 0x66; // f

    if (!isExifApp1) {
      for (let j = i; j < segmentEnd; j++) out.push(bytes[j]);
    }
    i = segmentEnd;
  }

  // Fell out of the loop without hitting SOS (truncated/unusual file) --
  // append whatever's left unchanged rather than losing image data.
  for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
  return Uint8Array.from(out);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Removes the "eXIf" ancillary chunk PNG has carried since the 2017 spec
 * addition (the one place EXIF/GPS data lives in a PNG). Every other
 * chunk, including unrelated ancillary ones, passes through untouched.
 */
export function stripPngExif(bytes: Uint8Array): Uint8Array {
  if (!matches(bytes, PNG_SIGNATURE)) return bytes;

  const out: number[] = [...PNG_SIGNATURE];
  let i = 8;

  while (i + 8 <= bytes.length) {
    const length = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
    const chunkEnd = i + 8 + length + 4; // + 4-byte CRC
    if (length < 0 || chunkEnd > bytes.length) break; // malformed; stop rather than guess

    if (type !== "eXIf") {
      for (let j = i; j < chunkEnd; j++) out.push(bytes[j]);
    }
    i = chunkEnd;
    if (type === "IEND") break;
  }

  for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
  return Uint8Array.from(out);
}

/** Strips EXIF for the formats this module knows how to; a no-op for anything else. */
export function stripExif(bytes: Uint8Array, mimeType: string): Uint8Array {
  if (mimeType === "image/jpeg") return stripJpegExif(bytes);
  if (mimeType === "image/png") return stripPngExif(bytes);
  return bytes;
}

export interface Dimensions {
  width: number;
  height: number;
}

function readPngDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 24 || !matches(bytes, PNG_SIGNATURE)) return null;
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  return { width, height };
}

function readGifDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 10 || !matches(bytes, [0x47, 0x49, 0x46, 0x38])) return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return { width, height };
}

// SOF markers (baseline/progressive/etc.) -- excludes 0xC4 (DHT), 0xC8
// (reserved/JPG), 0xCC (DAC), which share the 0xC_ range but are not SOF.
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpegDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    if (marker === 0xda) break; // scan data reached; no SOF found before it

    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (JPEG_SOF_MARKERS.has(marker) && i + 9 <= bytes.length) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height };
    }
    if (length < 2) break;
    i += 2 + length;
  }
  return null;
}

/** Reads pixel dimensions from a format header without decoding the image. */
export function readDimensions(bytes: Uint8Array, mimeType: string): Dimensions | null {
  if (mimeType === "image/jpeg") return readJpegDimensions(bytes);
  if (mimeType === "image/png") return readPngDimensions(bytes);
  if (mimeType === "image/gif") return readGifDimensions(bytes);
  return null;
}

export function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}
