import * as React from "react";
import { Link } from "react-router-dom";
import { formatBikramSambatDate, formatKathmanduDate } from "@paz/utils";
import { publicMediaUrl, useSiteInfo } from "../api/use-site";
import type { ImageVariant } from "../api/use-wall";
import { useLanguage, useLocalizedPath } from "../language";
import { Mark } from "./mark";
import { useWording, type WordingKey } from "../wording";

/** What a picture needs: the shape shared by a work's frames, a room's photographs and a thing's. */
export type PictureSource = {
  original_path: string | null;
  width: number | null;
  height: number | null;
  variants: unknown;
  alt: string | null;
  photographer: string | null;
};

/**
 * A work's picture: responsive sizes, modern format with a fallback,
 * explicit dimensions so nothing reflows, lazy below the fold. The full
 * resolution file is offered as a link, never loaded unasked (Build
 * Specification 6.9). Self-hosted, like everything else.
 */
export function WorkPicture({
  image,
  sizes,
  eager = false,
  fullSizeLink = false,
}: {
  image: PictureSource;
  sizes: string;
  eager?: boolean;
  fullSizeLink?: boolean;
}) {
  const variants = ((image.variants ?? []) as unknown as ImageVariant[])
    .filter((v) => v && typeof v.w === "number")
    .sort((a, b) => a.w - b.w);
  const srcSet = (key: "webp" | "jpg") =>
    variants
      .filter((v) => v[key])
      .map((v) => `${publicMediaUrl(v[key] as string)} ${v.w}w`)
      .join(", ");
  const webp = srcSet("webp");
  const jpg = srcSet("jpg");
  const largest = variants[variants.length - 1];
  const fallback = largest?.jpg ?? image.original_path;
  const width = image.width ?? undefined;
  const height = image.height ?? undefined;
  const w = useWording();

  return (
    <figure>
      <div className="work-surround">
        <picture>
          {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
          {jpg && <source type="image/jpeg" srcSet={jpg} sizes={sizes} />}
          <img
            src={publicMediaUrl(fallback as string)}
            alt={image.alt ?? ""}
            width={width}
            height={height}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        </picture>
      </div>
      <figcaption className="type-small mt-2 flex flex-wrap justify-between gap-x-4">
        <span>{w("common.photograph", { name: image.photographer })}</span>
        {fullSizeLink && (
          <a
            href={publicMediaUrl(image.original_path as string)}
            className="link-underline"
            rel="noopener noreferrer"
          >
            {w("common.full-size")}
          </a>
        )}
      </figcaption>
    </figure>
  );
}

/** Dates follow the language leading the surface: Gregorian where English
 * leads, Bikram Sambat where Nepali leads (Build Specification 13). */
export function useEraDate() {
  const { lang } = useLanguage();
  return React.useCallback(
    (value: string | Date) => {
      const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00Z`) : value;
      return lang === "ne" ? formatBikramSambatDate(d) : formatKathmanduDate(d);
    },
    [lang],
  );
}

export function PersonLink({ slug, name }: { slug: string; name: string }) {
  const localize = useLocalizedPath();
  return (
    <Link to={localize(`/people/${slug}`)} className="link-underline">
      {name}
    </Link>
  );
}

/**
 * Plain line, alternative address: what a form shows when the one dynamic
 * dependency is unavailable. The page itself always reads (11.4).
 */
export function FormUnavailable() {
  const info = useSiteInfo();
  const email = info.data?.["site.contact_email"];
  const w = useWording();
  return (
    <p role="alert" aria-live="assertive" className="type-small">
      {w("common.form-down")}
      {email ? (
        <>
          {" "}
          {w("common.form-write-to")}{" "}
          <a href={`mailto:${email}`} className="link-underline">
            {email}
          </a>{" "}
          {w("common.form-instead")}
        </>
      ) : (
        ` ${w("common.form-try-later")}`
      )}
    </p>
  );
}

/** Which page a form error is: a refusal to send is not "unavailable". */
export function isUnavailable(error: unknown): boolean {
  const kind = (error as { kind?: string } | null)?.kind;
  return kind === "unexpected" || kind === "network";
}

/**
 * Who is speaking is the site's primary distinction (Build Specification
 * 7.1). Three states, never by colour alone: each carries words and a
 * different rule.
 */
export type Speaker = "anonymous" | "house" | "signed";

const SPEAKER_TEXT: Record<Speaker, { label: WordingKey; seal: WordingKey }> = {
  anonymous: { label: "speaker.anonymous", seal: "speaker.anonymous-seal" },
  house: { label: "speaker.house", seal: "speaker.house-seal" },
  signed: { label: "speaker.signed", seal: "speaker.signed-seal" },
};

export function SpeakerNote({
  speaker,
  showSeal = true,
}: {
  speaker: Speaker;
  showSeal?: boolean;
}) {
  const t = SPEAKER_TEXT[speaker];
  const w = useWording();
  return (
    <p className={`speaker speaker-${speaker} type-small`}>
      {speaker !== "anonymous" && <Mark className="mr-2 inline-block align-text-bottom" />}
      <span className="font-semibold">{w(t.label)}.</span>
      {showSeal && <> {w(t.seal)}</>}
    </p>
  );
}
