import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useSiteInfo, LanguageProvider, LanguageToggle } from "@/modules/site";

/**
 * Public site chrome. The primary nav is deliberately curated, not
 * auto-generated from every published `page` item — the organs (House,
 * Hearth, Press, Guild, Record, Treasury) are the entry points, and
 * several routes that used to be top-level (Papers/Brief/Dispatch/Annual/
 * Pigeon Post, Record, Visit, Encounters, Menu, Reservations) now live
 * under whichever organ or section they conceptually belong to, per the
 * institution's own request. A newly published institutional page still
 * needs a line added here to appear in nav — a small ongoing cost, traded
 * for a nav that reads as a considered structure rather than a page list.
 */
const PRESS_ITEMS = [
  { to: "/papers", label: "Papers" },
  { to: "/brief", label: "Brief" },
  { to: "/dispatch", label: "Dispatch" },
  { to: "/annual", label: "Annual" },
  { to: "/pigeon-post", label: "Pigeon Post" },
  { to: "/send-a-pigeon", label: "Send a pigeon" },
];

function PressMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

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
        The Press ▾
      </button>
      {open && (
        <div className="bg-background border-border absolute left-0 top-full z-50 mt-3 flex min-w-40 flex-col gap-1 border p-2 shadow-lg">
          <NavLink
            to="/press"
            end
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="hover:bg-secondary px-3 py-2 font-sans text-sm"
          >
            The Press (overview)
          </NavLink>
          <div className="border-border my-1 border-t" />
          {PRESS_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="hover:bg-secondary px-3 py-2 font-sans text-sm"
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Logo({ siteName }: { siteName: string }) {
  // Ranjana wordmark: intentionally not built yet (spec §5 — display-only,
  // SVG or a dedicated font, never live text, commissioned separately).
  // No placeholder text on the live site in the meantime; the name alone
  // is the wordmark until the mark itself is ready to ship.
  return (
    <Link to="/" className="flex items-baseline gap-2 font-serif text-2xl leading-none">
      {siteName}
    </Link>
  );
}

function Header({ siteName }: { siteName: string }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { pathname } = useLocation();

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
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/house" className={navLinkClass}>
            The House
          </NavLink>
          <NavLink to="/hearth" className={navLinkClass}>
            The Hearth
          </NavLink>
          <PressMenu />
          <NavLink to="/guild" className={navLinkClass}>
            The Guild
          </NavLink>
          <NavLink to="/the-record" className={navLinkClass}>
            The Record
          </NavLink>
          <NavLink to="/treasury" className={navLinkClass}>
            The Treasury
          </NavLink>
          <NavLink to="/programmes" className={navLinkClass}>
            Programmes
          </NavLink>
          <NavLink to="/membership/apply" className={navLinkClass}>
            Membership
          </NavLink>
          <NavLink to="/journal" className={navLinkClass}>
            Journal
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
          <NavLink to="/search" className={navLinkClass} aria-label="Search">
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
          aria-label="Open menu"
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
              aria-label="Close menu"
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
            <Link to="/about" className="text-foreground/90 py-2 font-serif text-2xl">
              About
            </Link>
            <Link to="/house" className="text-foreground/90 py-2 font-serif text-2xl">
              The House
            </Link>
            <Link to="/hearth" className="text-foreground/90 py-2 font-serif text-2xl">
              The Hearth
            </Link>
            <p className="text-muted-foreground mb-1 mt-2 font-sans text-xs uppercase tracking-[0.14em]">
              The Press
            </p>
            <Link to="/press" className="text-foreground/90 py-1 pl-4 font-serif text-xl">
              Overview
            </Link>
            {PRESS_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-foreground/90 py-1 pl-4 font-serif text-xl"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/guild" className="text-foreground/90 mt-2 py-2 font-serif text-2xl">
              The Guild
            </Link>
            <Link to="/the-record" className="text-foreground/90 py-2 font-serif text-2xl">
              The Record
            </Link>
            <Link to="/treasury" className="text-foreground/90 py-2 font-serif text-2xl">
              The Treasury
            </Link>
            <Link to="/programmes" className="text-foreground/90 py-2 font-serif text-2xl">
              Programmes
            </Link>
            <Link to="/membership/apply" className="text-foreground/90 py-2 font-serif text-2xl">
              Membership
            </Link>
            <Link to="/journal" className="text-foreground/90 py-2 font-serif text-2xl">
              Journal
            </Link>
            <Link to="/contact" className="text-foreground/90 py-2 font-serif text-2xl">
              Contact
            </Link>
            <Link to="/search" className="text-foreground/90 py-2 font-serif text-2xl">
              Search
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
  const columns = [
    {
      heading: "Visit",
      links: [
        ["About", "/about"],
        ["The House", "/house"],
        ["Programmes", "/programmes"],
        ["Contact", "/contact"],
      ],
    },
    {
      heading: "The Press",
      links: [
        ["Overview", "/press"],
        ["Papers", "/papers"],
        ["Brief", "/brief"],
        ["Dispatch", "/dispatch"],
        ["Annual", "/annual"],
        ["Pigeon Post", "/pigeon-post"],
      ],
    },
    {
      heading: "The Organs",
      links: [
        ["The Hearth", "/hearth"],
        ["The Guild", "/guild"],
        ["The Record", "/the-record"],
        ["The Treasury", "/treasury"],
      ],
    },
  ] as const;

  return (
    <footer className="border-border border-t">
      <div className="w-wide grid gap-12 py-20 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="font-serif text-3xl">{siteName}</div>
          <p className="type-body mt-5 max-w-xs">
            A hospitality-led cultural institution in Kathmandu, kept by six organs and open to all.
          </p>
          <p className="type-small mt-6">
            Patan, Lalitpur
            <br />
            Kathmandu Valley, Nepal
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.heading}>
            <p className="type-caption mb-5">{col.heading}</p>
            <ul className="space-y-3">
              {col.links.map(([label, to]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-foreground/80 hover:text-brand font-sans text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="w-wide type-small border-border flex flex-col justify-between gap-4 border-t py-8 md:flex-row">
        <p>
          © {year} {siteName}. No cookies, no analytics, no reader tracking of any kind.
        </p>
        {contactEmail && (
          <a href={`mailto:${contactEmail}`} className="hover:text-brand transition-colors">
            {contactEmail}
          </a>
        )}
      </div>
    </footer>
  );
}

export function PublicLayout() {
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.data?.["site.name"] ?? "PAZ";
  const contactEmail = siteInfo.data?.["site.contact_email"];

  return (
    <LanguageProvider>
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
