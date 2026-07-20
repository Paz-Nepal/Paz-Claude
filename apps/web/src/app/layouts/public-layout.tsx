import { Link, NavLink, Outlet } from "react-router-dom";
import { usePublishedItems, useSiteInfo, LanguageProvider, LanguageToggle } from "@/modules/site";

/**
 * Public site chrome. Everything in it is CMS-controlled: the name/tagline/
 * contact email come from admin.settings (api.site_info), and the nav lists
 * every published item of type 'page' alongside the fixed Home/Journal
 * entries — publishing a page adds it to the site without a deploy.
 */
export function PublicLayout() {
  const siteInfo = useSiteInfo();
  const pages = usePublishedItems("page");

  const siteName = siteInfo.data?.["site.name"] ?? "PAZ";
  const contactEmail = siteInfo.data?.["site.contact_email"];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"} hover:text-foreground`;

  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="max-w-wide mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <Link to="/" className="font-serif text-xl">
              {siteName}
            </Link>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-5">
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/papers" className={navLinkClass}>
                Papers
              </NavLink>
              <NavLink to="/brief" className={navLinkClass}>
                Brief
              </NavLink>
              <NavLink to="/pigeon-post" className={navLinkClass}>
                Pigeon Post
              </NavLink>
              <NavLink to="/dispatch" className={navLinkClass}>
                Dispatch
              </NavLink>
              <NavLink to="/annual" className={navLinkClass}>
                Annual
              </NavLink>
              <NavLink to="/record" className={navLinkClass}>
                Record
              </NavLink>
              <NavLink to="/journal" className={navLinkClass}>
                Journal
              </NavLink>
              <NavLink to="/membership/apply" className={navLinkClass}>
                Membership
              </NavLink>
              <NavLink to="/programmes" className={navLinkClass}>
                Programmes
              </NavLink>
              <NavLink to="/menu" className={navLinkClass}>
                Menu
              </NavLink>
              <NavLink to="/reservations" className={navLinkClass}>
                Reservations
              </NavLink>
              {(pages.data ?? []).map((page) => (
                <NavLink key={page.id} to={`/${page.slug}`} className={navLinkClass}>
                  {page.title}
                </NavLink>
              ))}
              <LanguageToggle />
            </nav>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t">
          <div className="max-w-wide text-muted-foreground mx-auto flex flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm">
            <span>
              © {new Date().getFullYear()} {siteName}, Patan.
            </span>
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="hover:text-foreground">
                {contactEmail}
              </a>
            )}
          </div>
        </footer>
      </div>
    </LanguageProvider>
  );
}
