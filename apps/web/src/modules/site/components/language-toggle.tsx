import { Link } from "react-router-dom";
import { useLanguage, useOtherLanguagePath } from "../language";

/**
 * A real navigation to the other language's URL, not a client-side state
 * flip — switching language now means switching page (work plan Part III,
 * #17). The current page's own English/Nepali counterpart, not just the
 * homepage in the other language, so a reader mid-Paper doesn't lose their
 * place switching languages.
 */
export function LanguageToggle() {
  const { lang } = useLanguage();
  const other = useOtherLanguagePath();

  return (
    <div className="flex items-center gap-1 text-sm" role="group" aria-label="Language">
      {lang === "en" ? (
        <span className="font-medium">EN</span>
      ) : (
        <Link to={other.path} className="text-muted-foreground hover:text-foreground">
          EN
        </Link>
      )}
      <span className="text-muted-foreground" aria-hidden="true">
        /
      </span>
      {lang === "ne" ? (
        <span className="font-medium">ने</span>
      ) : (
        <Link to={other.path} className="text-muted-foreground hover:text-foreground">
          ने
        </Link>
      )}
    </div>
  );
}
