import { useLanguage } from "../language";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={lang === "en" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
      >
        EN
      </button>
      <span className="text-muted-foreground" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        onClick={() => setLang("ne")}
        aria-pressed={lang === "ne"}
        className={lang === "ne" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
      >
        ने
      </button>
    </div>
  );
}
