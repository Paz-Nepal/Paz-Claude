/**
 * Non-negotiable §4: every deposited item carries structured provenance,
 * rendered the same fixed way everywhere it appears rather than as
 * free-text copy a page could drift from.
 */
export function DepositProvenance({
  depositRef,
  license,
}: {
  depositRef: string | null | undefined;
  license?: string | null;
}) {
  if (!depositRef) return null;
  return (
    <p className="text-muted-foreground border-t pt-4 text-sm">
      Kept by the house · Deposited in the Record ({depositRef})
      {license && <> · {license}</>}
    </p>
  );
}
