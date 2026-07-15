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
