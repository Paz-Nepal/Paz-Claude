import { NavLink, Outlet } from "react-router-dom";

/**
 * A desk section with several screens: a title, a row of tabs, and the
 * screen below. Used where one part of the house has more than a couple of
 * registers to keep (the house as a place, the Record), so the desk's main
 * menu stays short.
 */
export function SectionLayout({
  title,
  intro,
  tabs,
}: {
  title: string;
  intro?: string;
  tabs: Array<{ to: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{title}</h1>
        {intro && <p className="text-muted-foreground text-sm">{intro}</p>}
        <nav aria-label={title} className="flex flex-wrap gap-1 border-b pb-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm ${
                  isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
