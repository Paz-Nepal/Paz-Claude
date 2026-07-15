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

/** True when `end` is strictly after `start` — mirrors the DB check constraints (see 0003 migration). */
export function isValidRange(start: Date | string, end: Date | string): boolean {
  const startMs = typeof start === "string" ? Date.parse(start) : start.getTime();
  const endMs = typeof end === "string" ? Date.parse(end) : end.getTime();
  return endMs > startMs;
}
