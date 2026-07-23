import * as React from "react";

export type Lang = "en" | "ne";

const STORAGE_KEY = "paz.lang";

const LanguageContext = React.createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>(null);

function readStored(): Lang {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(STORAGE_KEY) === "ne" ? "ne" : "en";
}

/**
 * A local UI preference, not tracking: nothing here is sent anywhere, it
 * only decides which language field a component reads (Non-negotiable §2 —
 * "no reader tracking" is about analytics/pixels/cookies, not a client-side
 * reading preference).
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(readStored);

  const setLang = React.useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/** Nepali field falls back to English when the item has no translation yet. */
export function pickLang(en: string, ne: string | null | undefined, lang: Lang): string {
  if (lang === "ne" && ne && ne.trim()) return ne;
  return en;
}

export function pickLangDoc<T>(en: T, ne: T | null | undefined, lang: Lang): T {
  if (lang === "ne" && ne != null) return ne;
  return en;
}
