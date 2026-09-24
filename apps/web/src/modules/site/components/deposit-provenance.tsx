/**
 * Non-negotiable §4: every deposited item carries structured provenance,
 * rendered the same fixed way everywhere it appears rather than as
 * free-text copy a page could drift from. Beneath the text, in order: the
 * deposit reference, the licence in plain words, and the citation form
 * (Build Specification 7.6). There is no date on a Paper's page; the date
 * lives in the Record.
 */
import { Mark } from "./mark";
import { useWording, type WordingKey } from "../wording";

const LICENCE_WORDS: Record<string, WordingKey> = {
  "CC BY": "provenance.cc-by",
  "CC BY-SA": "provenance.cc-by-sa",
};

export function DepositProvenance({
  depositRef,
  license,
  title,
  series,
}: {
  depositRef: string | null | undefined;
  license?: string | null;
  title?: string;
  series?: string;
}) {
  const w = useWording();
  if (!depositRef) return null;
  const licenceKey = license ? LICENCE_WORDS[license] : undefined;
  const citation = [title, series, w("provenance.place"), depositRef]
    .filter((part) => part && part.trim())
    .join(". ");
  return (
    <div className="text-muted-foreground border-t pt-4 text-sm">
      <p>
        <Mark className="mr-2 inline-block align-text-bottom" />
        {w("provenance.kept", { ref: depositRef })}
      </p>
      {license && (
        <p className="mt-1">
          {w("provenance.licence", { licence: license })} {licenceKey ? w(licenceKey) : ""}
        </p>
      )}
      <p className="mt-1">{w("provenance.cite-as", { citation })}</p>
    </div>
  );
}
