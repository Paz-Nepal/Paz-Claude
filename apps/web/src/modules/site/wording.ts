import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import defaults from "virtual:wording-defaults";
import { useLanguage, type Lang } from "./language";

/**
 * The fixed wording of the public site.
 *
 * Every line the site says that is not itself deposited work (menus, the
 * footer, page intros, the house's standing lines, form labels, empty
 * sections, the not-found page) is registered once in `wording.json`, with
 * the words it says by default and where it appears. The house rewords any
 * of them from the desk (Admin, Wording); a rewording lives in
 * admin.site_wording and wins over the default. Deleting the rewording
 * returns the line to the default, so nothing here can ever be left blank.
 *
 * scripts/prerender.mjs reads the same file and the same rewordings, so the
 * static pages and the app never say different things.
 *
 * Lines may carry {placeholders} (for example "Held by {name}"). The desk
 * shows which placeholders a line has; a rewording keeps them.
 */
export type WordingEntry = {
  /** Where the line appears, for grouping in the desk. */
  area: string;
  /** What the line is, in the desk's words. */
  label: string;
  /** The default English. */
  en: string;
  /** A default Nepali, where the house has one. */
  ne?: string;
};

export type WordingKey = keyof typeof import("./wording.json");

/** The words alone, served by the wording plugin; see wording-registry.ts for the desk's view. */
export type WordingDefault = { en: string; ne?: string };
export const DEFAULTS = defaults as Record<WordingKey, WordingDefault>;

export type WordingOverride = { key: string; en: string | null; ne: string | null };
type Vars = Record<string, string | number | null | undefined>;

export function fillPlaceholders(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

/** The placeholders a line carries, e.g. ["name"] for "Held by {name}". */
export function placeholdersOf(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string))];
}

/**
 * The words for one key, in one language. Nepali falls back to English
 * (the house's rewording first, then the default), the same fallback every
 * bilingual field on the site uses.
 */
export function resolveWording(
  key: WordingKey,
  lang: Lang,
  overrides: ReadonlyMap<string, WordingOverride> | undefined,
  vars?: Vars,
): string {
  const entry = DEFAULTS[key];
  const o = overrides?.get(key);
  const en = o?.en ?? entry?.en ?? key;
  const text = lang === "ne" ? (o?.ne ?? entry?.ne ?? en) : en;
  return fillPlaceholders(text, vars);
}

/**
 * The house's rewordings. If the table is not there yet (the migration has
 * not been applied) or the request fails, the site reads its defaults: a
 * failure here must never blank a menu or a label.
 */
export function useSiteWording() {
  return useQuery({
    queryKey: ["site-wording"],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<Map<string, WordingOverride>> => {
      const { data, error } = await supabase.schema("api").rpc("site_wording");
      if (error) return new Map();
      return new Map((data ?? []).map((r) => [r.key, { key: r.key, en: r.en, ne: r.ne }]));
    },
  });
}

export type Word = (key: WordingKey, vars?: Vars) => string;

/** `const w = useWording(); w("nav.wall")` gives the line in the reader's language. */
export function useWording(): Word {
  const { lang } = useLanguage();
  const overrides = useSiteWording().data;
  return React.useCallback(
    (key: WordingKey, vars?: Vars) => resolveWording(key, lang, overrides, vars),
    [lang, overrides],
  );
}

/** For the few places that sit outside the language provider (English only). */
export function useWordingEn(): Word {
  const overrides = useSiteWording().data;
  return React.useCallback(
    (key: WordingKey, vars?: Vars) => resolveWording(key, "en", overrides, vars),
    [overrides],
  );
}
