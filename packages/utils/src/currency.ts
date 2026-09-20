/**
 * All money in the database is integer cents (e.g. membership fees,
 * annual_fee_cents) — never floats — to avoid rounding drift. This is the
 * one place cents become a display string.
 */
const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "NPR",
  currencyDisplay: "code",
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Money on the Wall is stored in minor units (paisa for NPR). Whole rupees
 * are shown without decimals; a price is shown once, plainly.
 */
export function formatMoney(minor: number, currency = "NPR"): string {
  const major = minor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/** Height x width (x depth) in centimetres from millimetres, or null. */
export function formatDimensions(
  heightMm: number | null,
  widthMm: number | null,
  depthMm?: number | null,
): string | null {
  const parts = [heightMm, widthMm, depthMm ?? null].filter((n): n is number => n != null);
  if (parts.length === 0) return null;
  const cm = (mm: number) => String(Math.round(mm) / 10);
  return `${parts.map(cm).join(" × ")} cm`;
}
