import states from "./empty-states.json";

/**
 * One written sentence per section, for the day a section is open and
 * nothing is in it (Build Programme 1 and 3). Each is a promise the house
 * has undertaken, so each lives in one file, `empty-states.json`, that the
 * house can read and reword in one place. scripts/prerender.mjs reads the
 * same file, so the static pages and the app can never say different things.
 */
export type EmptyStateKey = keyof typeof states;

export function emptyState(key: EmptyStateKey): string {
  return states[key];
}
