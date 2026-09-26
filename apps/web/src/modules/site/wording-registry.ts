import registry from "./wording.json";
import type { WordingEntry, WordingKey } from "./wording";

/**
 * The whole register, with where each line appears and what the desk calls it.
 * Only the Wording screen and the tests need this; the site itself reads the
 * words alone (see wording.ts), so this file stays out of the eager bundle.
 */
export const WORDING = registry as Record<WordingKey, WordingEntry>;
export const WORDING_KEYS = Object.keys(registry) as WordingKey[];
