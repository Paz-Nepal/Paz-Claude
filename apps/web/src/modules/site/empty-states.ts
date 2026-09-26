import { DEFAULTS, useWording, type WordingKey } from "./wording";

/**
 * One written sentence per section, for the day a section is open and
 * nothing is in it (Build Programme 1 and 3). Each is a promise the house
 * has undertaken. They now live with the rest of the site's fixed wording in
 * `wording.json` (the "empty.*" keys), and the house rewords them from the
 * desk (Admin, Wording). scripts/prerender.mjs reads the same register and
 * rewordings, so the static pages and the app can never say different things.
 */
const KEYS = {
  wall: "empty.wall",
  artistNoWork: "empty.artist-no-work",
  shows: "empty.shows",
  sattal: "empty.sattal",
  sattalNoReader: "empty.sattal-no-reader",
  series: "empty.series",
  chronicle: "empty.chronicle",
  deposits: "empty.deposits",
  commons: "empty.commons",
  guild: "empty.guild",
  treasury: "empty.treasury",
  hands: "empty.hands",
  encounters: "empty.encounters",
  terms: "empty.terms",
} as const satisfies Record<string, WordingKey>;

export type EmptyStateKey = keyof typeof KEYS;

/** The sentence for an empty section, as the house has worded it. */
export function useEmptyState() {
  const w = useWording();
  return (key: EmptyStateKey) => w(KEYS[key]);
}

/** The default sentence only, for code outside the page tree. Prefer useEmptyState(). */
export function emptyState(key: EmptyStateKey): string {
  return DEFAULTS[KEYS[key]].en;
}
