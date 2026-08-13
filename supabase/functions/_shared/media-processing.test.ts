import { assertEquals } from "jsr:@std/assert@1";
import {
  extensionFor,
  maxBytesFor,
  readDimensions,
  sniffMimeType,
  stripJpegExif,
  stripPngExif,
} from "./media-processing.ts";

function u16be(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff];
}

function u32be(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function bytesOf(s: string): number[] {
  return Array.from(s).map((c) => c.charCodeAt(0));
}

// --- Fixture builders -----------------------------------------------------

function buildJpeg({
  withExif,
  width,
  height,
}: {
  withExif: boolean;
  width: number;
  height: number;
}): Uint8Array {
  const parts: number[] = [0xff, 0xd8]; // SOI

  if (withExif) {
    const exifPayload = [...bytesOf("Exif"), 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef];
    const app1Length = exifPayload.length + 2; // length field includes itself
    parts.push(0xff, 0xe1, ...u16be(app1Length), ...exifPayload);
  }

  // SOF0: marker, length(8), precision(1), height(2), width(2), components(1)
  const sofPayload = [0x08, ...u16be(height), ...u16be(width), 0x01];
  const sofLength = sofPayload.length + 2;
  parts.push(0xff, 0xc0, ...u16be(sofLength), ...sofPayload);

  // SOS + fake scan bytes (including a harmless FF 00 stuffed byte) + EOI
  parts.push(0xff, 0xda, 0x00, 0x02, 0x01, 0xff, 0x00, 0x99);
  parts.push(0xff, 0xd9);

  return Uint8Array.from(parts);
}

function buildPng({
  withExif,
  width,
  height,
}: {
  withExif: boolean;
  width: number;
  height: number;
}): Uint8Array {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  const ihdrData = [...u32be(width), ...u32be(height), 0x08, 0x06, 0x00, 0x00, 0x00];
  const ihdr = [...u32be(ihdrData.length), ...bytesOf("IHDR"), ...ihdrData, ...u32be(0)];

  const chunks: number[] = [...ihdr];
  if (withExif) {
    const exifData = [0x01, 0x02, 0x03, 0x04];
    chunks.push(...u32be(exifData.length), ...bytesOf("eXIf"), ...exifData, ...u32be(0));
  }
  const iend = [...u32be(0), ...bytesOf("IEND"), ...u32be(0)];
  chunks.push(...iend);

  return Uint8Array.from([...signature, ...chunks]);
}

// --- sniffMimeType ---------------------------------------------------------

Deno.test("sniffMimeType identifies JPEG, PNG, GIF, PDF", () => {
  assertEquals(
    sniffMimeType(buildJpeg({ withExif: false, width: 1, height: 1 }))?.mimeType,
    "image/jpeg",
  );
  assertEquals(
    sniffMimeType(buildPng({ withExif: false, width: 1, height: 1 }))?.mimeType,
    "image/png",
  );
  assertEquals(sniffMimeType(Uint8Array.from(bytesOf("GIF89a")))?.mimeType, "image/gif");
  assertEquals(sniffMimeType(Uint8Array.from(bytesOf("%PDF-1.4")))?.mimeType, "application/pdf");
});

Deno.test("sniffMimeType rejects an unrecognized or spoofed file", () => {
  const fakeExe = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]); // "MZ..." (a Windows PE header)
  assertEquals(sniffMimeType(fakeExe), null);
});

// --- EXIF stripping ---------------------------------------------------------

Deno.test("stripJpegExif removes the APP1/Exif segment but keeps image data", () => {
  const withExif = buildJpeg({ withExif: true, width: 100, height: 50 });
  const without = buildJpeg({ withExif: false, width: 100, height: 50 });

  const stripped = stripJpegExif(withExif);

  const strippedBytes = Array.from(stripped).join(",");
  assertEquals(strippedBytes.includes(bytesOf("Exif").join(",")), false);
  assertEquals(stripped.length, without.length);
  assertEquals(readDimensions(stripped, "image/jpeg"), { width: 100, height: 50 });
});

Deno.test("stripJpegExif is a no-op when there is no EXIF segment", () => {
  const jpeg = buildJpeg({ withExif: false, width: 20, height: 10 });
  assertEquals(stripJpegExif(jpeg), jpeg);
});

Deno.test("stripPngExif removes the eXIf chunk but keeps IHDR/IEND", () => {
  const withExif = buildPng({ withExif: true, width: 64, height: 32 });
  const without = buildPng({ withExif: false, width: 64, height: 32 });

  const stripped = stripPngExif(withExif);

  assertEquals(stripped.length, without.length);
  assertEquals(readDimensions(stripped, "image/png"), { width: 64, height: 32 });
});

// --- Dimensions --------------------------------------------------------------

Deno.test("readDimensions reads JPEG and PNG headers correctly", () => {
  assertEquals(
    readDimensions(buildJpeg({ withExif: false, width: 800, height: 600 }), "image/jpeg"),
    { width: 800, height: 600 },
  );
  assertEquals(
    readDimensions(buildPng({ withExif: false, width: 1024, height: 768 }), "image/png"),
    { width: 1024, height: 768 },
  );
});

Deno.test("readDimensions returns null for a format it doesn't parse", () => {
  assertEquals(readDimensions(Uint8Array.from(bytesOf("%PDF-1.4")), "application/pdf"), null);
});

// --- Size caps / extensions ---------------------------------------------------

Deno.test("maxBytesFor and extensionFor match the documented caps (D-8)", () => {
  assertEquals(maxBytesFor("image"), 15 * 1024 * 1024);
  assertEquals(maxBytesFor("document"), 50 * 1024 * 1024);
  assertEquals(extensionFor("image/jpeg"), "jpg");
  assertEquals(extensionFor("application/pdf"), "pdf");
});
