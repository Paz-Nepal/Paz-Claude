# ADR-22: Media Lifecycle & Image Processing

**Status:** Partially implemented (`supabase/functions/ingest-media/`,
`supabase/functions/_shared/media-processing.ts`) — see "Still open" below.

## Decision

`ingest-media` replaces the previous direct-to-storage upload path
(`publishing.media` migration `0008`'s own comment flagged this as
deliberately absent, pending this Edge Function — T-041). It:

1. **Sniffs the real file type from magic bytes** (JPEG/PNG/GIF/PDF) —
   never trusts the browser-reported `file.type`, which is trivially
   spoofable.
2. **Enforces size caps by category** (images 15MB, documents 50MB) per
   the Build Readiness Review's D-8 numbers.
3. **Strips EXIF from JPEG and PNG** by removing the metadata
   segment/chunk (JPEG's `APP1`/`Exif` marker, PNG's `eXIf` chunk) at the
   byte level — this is what actually closes the concrete privacy risk
   D-8 names (a photographer's GPS coordinates leaking through an
   uploaded photo).
4. **Reads pixel dimensions from the format header** (JPEG/PNG/GIF)
   instead of the previous client-side `createImageBitmap` decode, which
   silently failed for some formats and couldn't be trusted anyway (it
   ran before any server-side validation).

## Why byte-level processing instead of a real image codec

D-8's fuller spec calls for images "re-encoded to clean originals" — a
full pixel-level re-encode, not just metadata removal. That needs an
actual image codec (a wasm build of libvips/imagemagick, or similar) as a
dependency. This repository has no way to load-test a wasm dependency
inside an Edge Function in the environment these decisions were made in,
and shipping unverified image-decoding code is a worse outcome than a
narrower, hand-verifiable implementation: `_shared/media-processing.ts`
is pure byte manipulation with no external dependency, and every function
in it has a corresponding test in `_shared/media-processing.test.ts` that
constructs a synthetic file byte-for-byte and checks the exact output.

This covers the two concrete risks D-8 exists to close (spoofed file
type, leaked EXIF/GPS) without pretending to have solved the part that
needs infrastructure this repo doesn't have access to yet.

## Still open (not implemented here)

- **T-021's spike** (Supabase Image Transformations vs. on-ingest
  multi-width generation) is still undecided — it requires checking
  feature availability on PAZ's actual Supabase plan tier, which isn't
  visible from this repository. Until decided, the renderer has exactly
  one width per image (the cleaned original) to work with.
- **Full pixel re-encoding** ("clean originals") is not implemented — see
  above. If a real codec dependency is added later, this ADR should be
  revised, not silently superseded.
- **WEBP** is not accepted. Sniffing it is trivial, but this module has
  no dimension-reading or EXIF-stripping logic for it (see the comment in
  `media-processing.ts`), and accepting a type it can't otherwise process
  would defeat the point.
- **The monthly orphan report** (D-8: media unreferenced by any item) is
  still absent — media rows accumulate and are never deleted, exactly as
  designed for now, but nobody is watching for orphans yet.

## Consequences

- `publishing.media.create` still gates both the storage write and
  `api.register_media` — the Edge Function uses the caller's own
  forwarded JWT, not `service_role`, so this is a hardening of the
  existing permission model, not a new one.
- A file that isn't JPEG, PNG, GIF, or PDF is rejected outright (415) —
  including SVG, which the previous client-side path accepted without
  any server-side check at all.
