/**
 * Timezone helpers.
 *
 * Rule (Architecture Blueprint §4.1): all timestamps are stored UTC.
 * Asia/Kathmandu (UTC+5:45) is a *display* concern only. Every place the UI
 * shows or accepts a date/time for a human (scheduling, service periods,
 * renewal notices) must go through these helpers rather than reimplementing
 * timezone math — Nepal's 45-minute offset is unusually easy to get wrong
 * with ad-hoc arithmetic.
 */

export const PAZ_TIME_ZONE = "Asia/Kathmandu";

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PAZ_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats a UTC instant for display in Kathmandu local time, with the zone labeled. */
export function formatKathmanduTime(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return `${displayFormatter.format(date)} (Asia/Kathmandu)`;
}

const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PAZ_TIME_ZONE,
  dateStyle: "medium",
});

/**
 * Date-only display in Kathmandu local time, without the zone suffix — for
 * dense surfaces (tables, bylines) where the full labeled form is noise.
 */
export function formatKathmanduDate(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return dateOnlyFormatter.format(date);
}

/** Nepal Time has used a fixed UTC+05:45 offset with no DST since 1986 —
 * safe to hardcode rather than compute per-instant. */
const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

/**
 * Converts a `<input type="datetime-local">` value (a timezone-naive
 * "YYYY-MM-DDTHH:mm" string) into a UTC ISO string, interpreting it as
 * Asia/Kathmandu wall-clock time — the reverse of {@link formatKathmanduTime}.
 * `new Date(value)` alone parses a datetime-local string using the
 * browser's own local timezone, which is only correct by coincidence
 * when the person entering it happens to be in Kathmandu themselves —
 * this makes the interpretation explicit instead (T-061: "Asia/Kathmandu
 * labeled" scheduling).
 */
export function kathmanduInputToUtcIso(localValue: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localValue);
  if (!match) {
    throw new Error(`kathmanduInputToUtcIso: not a datetime-local value: ${localValue}`);
  }
  const [, year, month, day, hour, minute] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - KATHMANDU_OFFSET_MINUTES * 60_000;
  return new Date(utcMs).toISOString();
}

/** True when `end` is strictly after `start` — mirrors the DB check constraints (see 0003 migration). */
export function isValidRange(start: Date | string, end: Date | string): boolean {
  const startMs = typeof start === "string" ? Date.parse(start) : start.getTime();
  const endMs = typeof end === "string" ? Date.parse(end) : end.getTime();
  return endMs > startMs;
}
