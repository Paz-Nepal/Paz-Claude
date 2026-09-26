import { readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const ID = "virtual:wording-defaults";
const RESOLVED = `\0${ID}`;

/**
 * The site's wording register (src/modules/site/wording.json) carries, for
 * each line, where it appears and what it is called in the desk. Readers never
 * need that, only the words. This serves the words alone as a virtual module,
 * so the desk's metadata stays out of the eager bundle and is fetched only with
 * the Wording screen.
 */
export function wordingDefaults(): Plugin {
  const file = path.resolve(__dirname, "src/modules/site/wording.json");
  return {
    name: "paz-wording-defaults",
    resolveId(id) {
      return id === ID ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      this.addWatchFile(file);
      const registry = JSON.parse(readFileSync(file, "utf8")) as Record<
        string,
        { en: string; ne?: string }
      >;
      const defaults: Record<string, { en: string; ne?: string }> = {};
      for (const [key, entry] of Object.entries(registry)) {
        defaults[key] = entry.ne ? { en: entry.en, ne: entry.ne } : { en: entry.en };
      }
      return `export default ${JSON.stringify(defaults)};`;
    },
  };
}
