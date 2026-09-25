import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  useSiteInfo,
  LanguageProvider,
  LanguageToggle,
  useLocalizedPath,
  useWording,
  type Lang,
  type WordingKey,
} from "@/modules/site";

/**
 * Public site chrome. Four sections at the top level, in this order: The
 * Wall, The Press, The House, The Record (Build Specification 3).
 * Governance material is public and sits at the foot. The primary nav is
 * curated, not generated from published pages.
 *
 * Every `to=`/`href=` target in this file is routed through
 * `useLocalizedPath()` (aliased `localize` below) so nav/footer links stay
 * on the current language's "/ne" prefix instead of silently dropping a
 * Nepali reader back into English mid-click.
 */
const PRESS_ITEMS: ReadonlyArray<{ to: string; label: WordingKey }> = [
  { to: "/papers", label: "nav.papers" },
  { to: "/sattal", label: "nav.sattal" },
  { to: "/pigeon-post", label: "nav.pigeon-post" },
  { to: "/brief", label: "nav.brief" },
  { to: "/dispatch", label: "nav.dispatch" },
  { to: "/annual", label: "nav.annual" },
  { to: "/send-a-pigeon", label: "nav.send-a-pigeon" },
];

function PressMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const localize = useLocalizedPath();
  const w = useWording();

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-foreground/80 hover:text-brand font-sans text-sm transition-colors"
      >
        {w("nav.press")} ▾
      </button>
      {open && (
        <div className="bg-background border-border absolute left-0 top-full z-50 mt-3 flex min-w-40 flex-col gap-1 border p-2 shadow-lg">
          <NavLink
            to={localize("/press")}
            end
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="hover:bg-secondary px-3 py-2 font-sans text-sm"
          >
            {w("nav.press-overview")}
          </NavLink>
          <div className="border-border my-1 border-t" />
          {PRESS_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={localize(item.to)}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="hover:bg-secondary px-3 py-2 font-sans text-sm"
            >
              {w(item.label)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Logo({ siteName }: { siteName: string }) {
  const localize = useLocalizedPath();
  // Ranjana wordmark: intentionally not built yet (spec §5 — display-only,
  // SVG or a dedicated font, never live text, commissioned separately).
  // No placeholder text on the live site in the meantime; the name alone
  // is the wordmark until the mark itself is ready to ship.
  return (
    <Link to={localize("/")} className="flex items-baseline gap-2 font-serif text-2xl leading-none">
      {siteName}
    </Link>
  );
}

function Header({ siteName }: { siteName: string }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { pathname } = useLocation();
  const localize = useLocalizedPath();
  const w = useWording();

  React.useEffect(() => setMobileOpen(false), [pathname]);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `font-sans text-sm transition-colors hover:text-brand ${isActive ? "text-brand" : "text-foreground/80"}`;

  return (
    <header
      className={`border-border sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur" : "bg-background"
      }`}
    >
      <div className="w-wide flex h-20 items-center justify-between">
        <Logo siteName={siteName} />
        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          <NavLink to={localize("/wall")} className={navLinkClass}>
            {w("nav.wall")}
          </NavLink>
          <PressMenu />
          <NavLink to={localize("/house")} className={navLinkClass}>
            {w("nav.house")}
          </NavLink>
          <NavLink to={localize("/record")} className={navLinkClass}>
            {w("nav.record")}
          </NavLink>
          <NavLink to={localize("/search")} className={navLinkClass} aria-label={w("nav.search")}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
          </NavLink>
          <LanguageToggle />
        </nav>
        <button
          type="button"
          className="p-2 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label={w("nav.open-menu")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="bg-background fixed inset-0 z-50 flex flex-col overflow-y-auto lg:hidden">
          <div className="w-wide flex h-20 items-center justify-between">
            <Logo siteName={siteName} />
            <button
              type="button"
              className="p-2"
              onClick={() => setMobileOpen(false)}
              aria-label={w("nav.close-menu")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav className="w-wide mt-4 flex flex-1 flex-col gap-1 pb-12">
            <Link to={localize("/wall")} className="text-foreground/90 py-2 font-serif text-2xl">
              {w("nav.wall")}
            </Link>
            <p className="text-muted-foreground mb-1 mt-2 font-sans text-xs tracking-[0.14em]">
              {w("nav.press")}
            </p>
            <Link
              to={localize("/press")}
              className="text-foreground/90 py-1 pl-4 font-serif text-xl"
            >
              {w("nav.overview")}
            </Link>
            {PRESS_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={localize(item.to)}
                className="text-foreground/90 py-1 pl-4 font-serif text-xl"
              >
                {w(item.label)}
              </Link>
            ))}
            <Link
              to={localize("/house")}
              className="text-foreground/90 mt-2 py-2 font-serif text-2xl"
            >
              {w("nav.house")}
            </Link>
            <Link to={localize("/record")} className="text-foreground/90 py-2 font-serif text-2xl">
              {w("nav.record")}
            </Link>
            <Link to={localize("/search")} className="text-foreground/90 py-2 font-serif text-2xl">
              {w("nav.search")}
            </Link>
            <div className="mt-4">
              <LanguageToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer({
  siteName,
  contactEmail,
}: {
  siteName: string;
  contactEmail: string | undefined;
}) {
  const year = new Date().getFullYear();
  const localize = useLocalizedPath();
  const w = useWording();
  const columns: ReadonlyArray<{
    heading: WordingKey;
    links: ReadonlyArray<readonly [WordingKey, string]>;
  }> = [
    {
      heading: "footer.col-wall",
      links: [
        ["nav.wall", "/wall"],
        ["nav.sattal", "/sattal"],
      ],
    },
    {
      heading: "footer.col-press",
      links: [
        ["nav.overview", "/press"],
        ["nav.papers", "/papers"],
        ["nav.pigeon-post", "/pigeon-post"],
        ["nav.brief", "/brief"],
        ["nav.dispatch", "/dispatch"],
        ["nav.annual", "/annual"],
      ],
    },
    {
      heading: "footer.col-house",
      links: [
        ["nav.house", "/house"],
        ["footer.at-the-house", "/at-the-house"],
        ["nav.record", "/record"],
        ["footer.chronicle", "/chronicle"],
        ["footer.friends", "/friends"],
        ["footer.commons", "/commons"],
        ["footer.programmes", "/programmes"],
        ["footer.contact", "/contact"],
      ],
    },
  ];

  // Governance material is public and belongs at the foot of the site,
  // not the front (Build Specification 3).
  const governance: ReadonlyArray<readonly [WordingKey, string]> = [
    ["footer.canon", "/canon"],
    ["footer.name", "/name"],
    ["footer.words", "/words"],
    ["footer.looking-for", "/looking-for"],
    ["footer.privacy", "/privacy"],
    ["footer.leaving", "/leaving"],
    ["footer.verify", "/verify"],
    ["footer.terms", "/terms"],
  ];

  return (
    <footer className="border-border border-t">
      <div className="w-wide grid gap-12 py-20 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="font-serif text-3xl">{siteName}</div>
          {/* Standing Specifications, 18 Sept 2026, "Said aloud": "PAZ
              rhymes with the English word 'cause', with the z sounded...
              This is to be written out on the site, so that the name has
              one pronunciation rather than three." The site's own
              description used to fill the space below this line -- that
              was retired brand language ("hospitality-led cultural
              institution...") and is removed rather than reworded; the
              house supplies the replacement. */}
          <p className="type-small mt-5 max-w-xs">{w("footer.pronunciation")}</p>
          <p className="type-small mt-6">
            {w("footer.place-line-1")}
            <br />
            {w("footer.place-line-2")}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.heading}>
            <p className="type-caption mb-5">{w(col.heading)}</p>
            <ul className="space-y-3">
              {col.links.map(([label, to]) => (
                <li key={to}>
                  <Link
                    to={localize(to)}
                    className="text-foreground/80 hover:text-brand font-sans text-sm transition-colors"
                  >
                    {w(label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="w-wide type-small border-border flex flex-col justify-between gap-4 border-t py-8 md:flex-row md:items-center">
        <p>{w("footer.no-tracking", { year, name: siteName })}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {governance.map(([label, to]) => (
            <Link key={to} to={localize(to)} className="hover:text-brand transition-colors">
              {w(label)}
            </Link>
          ))}
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="hover:text-brand transition-colors">
              {contactEmail}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ lang }: { lang: Lang }) {
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.data?.["site.name"] ?? "PAZ";
  const contactEmail = siteInfo.data?.["site.contact_email"];

  return (
    <LanguageProvider lang={lang}>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteName} />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer siteName={siteName} contactEmail={contactEmail} />
      </div>
    </LanguageProvider>
  );
}
