/**
 * Non-negotiable §4: every deposited item carries structured provenance,
 * rendered the same fixed way everywhere it appears rather than as
 * free-text copy a page could drift from. Beneath the text, in order: the
 * deposit reference, the licence in plain words, and the citation form
 * (Build Specification 7.6). There is no date on a Paper's page; the date
 * lives in the Record.
 */
const LICENCE_WORDS: Record<string, string> = {
  "CC BY": "Anyone may copy, share and adapt this text, provided they credit it.",
  "CC BY-SA":
    "Anyone may copy, share and adapt this text, provided they credit it and share what they make on the same terms.",
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
  if (!depositRef) return null;
  const citation = [title, series, "PAZ, Patan, Lalitpur", depositRef]
    .filter((part) => part && part.trim())
    .join(". ");
  return (
    <div className="text-muted-foreground border-t pt-4 text-sm">
      <p>Kept by the house · Deposited in the Record ({depositRef})</p>
      {license && (
        <p className="mt-1">
          Licence: {license}. {LICENCE_WORDS[license] ?? ""}
        </p>
      )}
      <p className="mt-1">Cite as: {citation}.</p>
    </div>
  );
}
