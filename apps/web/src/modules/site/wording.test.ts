import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

// wording.ts reads the house's rewordings through the Supabase client; these
// tests only exercise the register and the resolution rules.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
import {
  WORDING,
  WORDING_KEYS,
  fillPlaceholders,
  placeholdersOf,
  resolveWording,
  type WordingKey,
  type WordingOverride,
} from "./wording";

const EM_DASH = String.fromCharCode(8212);
const overrides = (rows: WordingOverride[]) => new Map(rows.map((r) => [r.key, r]));

describe("the wording register", () => {
  it("has keys the database accepts", () => {
    // Mirrors the check constraint on admin.site_wording.key (0080).
    for (const key of WORDING_KEYS) expect(key).toMatch(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
  });

  it("says something for every line, in a place and with a label", () => {
    for (const key of WORDING_KEYS) {
      const e = WORDING[key];
      expect(e.en.trim(), key).not.toBe("");
      expect(e.en, key).toBe(e.en.trim());
      expect(e.area.trim(), key).not.toBe("");
      expect(e.label.trim(), key).not.toBe("");
    }
  });

  it("keeps the house style: no em dash in any default", () => {
    for (const key of WORDING_KEYS) {
      expect(WORDING[key].en.includes(EM_DASH), key).toBe(false);
      expect((WORDING[key].ne ?? "").includes(EM_DASH), key).toBe(false);
    }
  });

  it("gives a default Nepali the same placeholders as the English", () => {
    for (const key of WORDING_KEYS) {
      const ne = WORDING[key].ne;
      if (ne)
        expect(placeholdersOf(ne).sort(), key).toEqual(placeholdersOf(WORDING[key].en).sort());
    }
  });

  it("has every key the static pages ask for", () => {
    // Tests run from apps/web; the script sits at the repository root.
    const script = readFileSync(resolve(process.cwd(), "../../scripts/prerender.mjs"), "utf8");
    const asked = [...script.matchAll(/(?:say|wHtml)\("([a-z0-9.-]+)"/g)].map((m) => m[1]);
    const inTables = [...script.matchAll(/"((?:[a-z]+)\.[a-z0-9-]+)"/g)]
      .map((m) => m[1] as string)
      .filter((k) => !/\.(txt|xml|html|json|svg)$/.test(k)) // file names, not keys
      .filter((k) =>
        /^(nav|footer|title|home|house|record|organ|press|series|papers|hands|terms|encounters|work|sattal|commons|empty|static|speaker|provenance|common|pigeon|brief|dispatch|annual|voice|safeguarding|guild|treasury|contact|search|person|show|words|wall)\./.test(
          k,
        ),
      );
    expect(asked.length).toBeGreaterThan(20);
    for (const key of [...asked, ...inTables]) expect(WORDING, key).toHaveProperty([key as string]);
  });
});

describe("resolveWording", () => {
  const key: WordingKey = "nav.wall";

  it("uses the default when the house has not reworded a line", () => {
    expect(resolveWording(key, "en", undefined)).toBe("The Wall");
    expect(resolveWording(key, "en", new Map())).toBe("The Wall");
  });

  it("uses the house's English when there is one", () => {
    const o = overrides([{ key, en: "The Gallery", ne: null }]);
    expect(resolveWording(key, "en", o)).toBe("The Gallery");
  });

  it("gives Nepali readers the Nepali, and the English when there is none", () => {
    expect(resolveWording(key, "ne", overrides([{ key, en: null, ne: "भित्ता" }]))).toBe("भित्ता");
    expect(resolveWording(key, "ne", overrides([{ key, en: "The Gallery", ne: null }]))).toBe(
      "The Gallery",
    );
    expect(resolveWording(key, "ne", undefined)).toBe("The Wall");
  });

  it("falls back to a default Nepali where the register has one", () => {
    expect(resolveWording("common.untranslated", "ne", undefined)).toBe(
      WORDING["common.untranslated"].ne,
    );
  });

  it("fills placeholders, and leaves unknown ones visible rather than blank", () => {
    expect(resolveWording("hands.held-by", "en", undefined, { name: "Asha" })).toBe("Held by Asha");
    expect(fillPlaceholders("Held by {name}", {})).toBe("Held by {name}");
    expect(placeholdersOf("{form} no. {number}")).toEqual(["form", "number"]);
  });
});
