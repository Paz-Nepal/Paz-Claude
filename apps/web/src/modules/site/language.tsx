import * as React from "react";
import { useLocation } from "react-router-dom";

export type Lang = "en" | "ne";

const STORAGE_KEY = "paz.lang";

const LanguageContext = React.createContext<Lang | null>(null);

/**
 * Nepali has a real URL now ("/ne/…", work plan Part III #17) — `lang` is
 * provided by the router (which of the two mounted trees matched), not
 * read from localStorage on load, so a bare fetch of either prefix (a
 * crawler, a curl, someone with JS disabled) sees the language the URL
 * actually says. localStorage still remembers the reader's last choice —
 * nothing here is sent anywhere, it only decides which language field a
 * component reads and which prefix the language toggle links to next
 * (Non-negotiable §2 — "no reader tracking" is about analytics/pixels/
 * cookies, not a client-side reading preference).
 */
export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  React.useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const lang = React.useContext(LanguageContext);
  if (lang === null) throw new Error("useLanguage must be used within LanguageProvider");
  return { lang };
}

/**
 * Prefixes a site-relative path ("/papers/some-slug", "/") with "/ne" when
 * reading in Nepali — the one place every internal link has to route
 * through so cross-links stay in the current language instead of quietly
 * dropping the reader back into English. Both route trees (router.tsx)
 * mirror every path exactly, so this never has to guess which routes have
 * a Nepali counterpart — all of them do.
 */
export function useLocalizedPath() {
  const { lang } = useLanguage();
  return React.useCallback(
    (path: string) => {
      if (lang !== "ne") return path;
      if (path === "/") return "/ne";
      return `/ne${path}`;
    },
    [lang],
  );
}

/** The current page, in the other language — what the language toggle
 * links to. Strips/adds the "/ne" prefix on the current pathname rather
 * than needing to know the route itself. */
export function useOtherLanguagePath(): { lang: Lang; path: string } {
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  if (lang === "ne") {
    const rest = pathname.replace(/^\/ne(\/|$)/, "/");
    return { lang: "en", path: rest };
  }
  return { lang: "ne", path: pathname === "/" ? "/ne" : `/ne${pathname}` };
}

function docHasContent(ne: unknown): boolean {
  const content = (ne as { content?: unknown[] } | null | undefined)?.content;
  return Array.isArray(content) && content.length > 0;
}

/** Nepali field falls back to English when the item has no translation yet. */
export function pickLang(en: string, ne: string | null | undefined, lang: Lang): string {
  if (lang === "ne" && ne && ne.trim()) return ne;
  return en;
}

/**
 * True when reading in Nepali but this particular field has nothing
 * translated (an untranslated ProseMirror body, work plan Part III, #21:
 * "the fallback is silent... a reader in Nepali mode cannot tell the
 * difference between 'translated' and 'not translated yet'"). Callers use
 * this to show a visible notice rather than let the English text pass
 * silently — pickLang/pickLangDoc still do the actual fallback, this is
 * only for deciding whether to say so.
 */
export function isUntranslatedDoc(ne: unknown, lang: Lang): boolean {
  return lang === "ne" && !docHasContent(ne);
}

/**
 * Nepali field falls back to English when there's no translation yet —
 * same as `pickLang`, but for a ProseMirror doc, where "no translation"
 * isn't just null: every bilingual body field gets an empty doc
 * (`{type: "doc", content: []}`) seeded on item creation whether or not
 * anyone's translated it, so `ne != null` alone would treat that seed as
 * real content and render a blank body instead of falling back.
 */
export function pickLangDoc<T>(en: T, ne: T | null | undefined, lang: Lang): T {
  if (lang === "ne" && docHasContent(ne)) return ne as T;
  return en;
}
