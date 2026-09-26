import * as React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@paz/ui";
import { useAuthContext } from "@/lib/auth-context";
import { useAuthorization } from "@/modules/auth-core";

const DASHBOARD_PERMISSIONS = [
  "analytics.dashboard.editorial",
  "analytics.dashboard.programs",
  "analytics.dashboard.membership",
  "analytics.dashboard.finance",
  "analytics.dashboard.vitals",
];

type Entry = { to: string; label: string; permissions: string[] };
type Group = { title: string; entries: Entry[] };

/**
 * The desk, grouped by what a person is doing rather than by table. A person
 * sees only the entries they may use, and a group with nothing they may use
 * does not appear at all.
 */
const GROUPS: Group[] = [
  {
    title: "Start here",
    entries: [
      {
        to: "/admin/launch",
        label: "Before opening",
        permissions: ["publishing.item.create", "wall.manage", "admin.settings.read"],
      },
      { to: "/admin/dashboard", label: "Dashboard", permissions: DASHBOARD_PERMISSIONS },
      {
        to: "/admin/offers",
        label: "Offers",
        permissions: [
          "wall.manage",
          "sattal.manage",
          "commons.manage",
          "house.manage",
          "publishing.item.update",
          "identity.person.erase",
        ],
      },
      { to: "/admin/concerns", label: "Concerns", permissions: ["safeguarding.read"] },
    ],
  },
  {
    title: "Wall",
    entries: [
      { to: "/admin/wall/people", label: "People", permissions: ["wall.manage"] },
      { to: "/admin/wall/works", label: "Works", permissions: ["wall.manage"] },
      { to: "/admin/wall/shows", label: "Shows", permissions: ["wall.manage"] },
      { to: "/admin/wall/dealings", label: "Dealings", permissions: ["wall.manage"] },
    ],
  },
  {
    title: "Press",
    entries: [
      { to: "/admin/desk", label: "Desk", permissions: ["publishing.item.create"] },
      { to: "/admin/sattal", label: "Sattal", permissions: ["sattal.manage"] },
      {
        to: "/admin/pigeon-submissions",
        label: "Send a pigeon",
        permissions: ["publishing.item.read"],
      },
      {
        to: "/admin/pigeon-reach",
        label: "Where the pigeons went",
        permissions: ["publishing.item.update"],
      },
      { to: "/admin/objects", label: "Objects", permissions: ["publishing.item.update"] },
      { to: "/admin/brief", label: "Brief", permissions: ["mail.manage"] },
      { to: "/admin/chronicle", label: "Chronicle", permissions: ["chronicle.line.create"] },
      { to: "/admin/words", label: "Words", permissions: ["publishing.item.update"] },
    ],
  },
  {
    title: "The house",
    entries: [
      { to: "/admin/house", label: "Rooms, things, the year", permissions: ["house.manage"] },
      { to: "/admin/encounters", label: "Encounters", permissions: ["encounters.manage"] },
      { to: "/admin/places", label: "Places tended", permissions: ["encounters.manage"] },
      { to: "/admin/hands", label: "Hands", permissions: ["governance.manage"] },
      { to: "/admin/guild", label: "Guild", permissions: ["guild.manage"] },
      { to: "/admin/commons", label: "Commons", permissions: ["commons.manage"] },
      { to: "/admin/treasury", label: "Treasury", permissions: ["treasury.manage"] },
    ],
  },
  {
    title: "The Record",
    entries: [
      { to: "/admin/record", label: "Catalogue and papers", permissions: ["record.manage"] },
      { to: "/admin/voice", label: "A voice", permissions: ["crm.voice.read"] },
    ],
  },
  {
    title: "People and money",
    entries: [
      {
        to: "/admin/applications",
        label: "Applications",
        permissions: ["membership.application.read"],
      },
      { to: "/admin/members", label: "Members", permissions: ["membership.member.read"] },
      { to: "/admin/tiers", label: "Friends tiers", permissions: ["membership.tier.manage"] },
      { to: "/admin/programmes", label: "Programmes", permissions: ["programs.program.read"] },
      {
        to: "/admin/organizations",
        label: "Organizations",
        permissions: ["crm.organization.read"],
      },
      {
        to: "/admin/relationships",
        label: "Relationships",
        permissions: ["crm.relationship.read"],
      },
      { to: "/admin/pledges", label: "Pledges", permissions: ["crm.pledge.read"] },
    ],
  },
  {
    title: "The site",
    entries: [
      { to: "/admin/media", label: "Media", permissions: ["publishing.media.read"] },
      { to: "/admin/wording", label: "Wording", permissions: ["site.wording.manage"] },
      {
        to: "/admin/settings",
        label: "Settings and publishing",
        permissions: ["admin.settings.read"],
      },
    ],
  },
];

export function AdminLayout() {
  const { session, signOut } = useAuthContext();
  const { permissions } = useAuthorization();
  const [open, setOpen] = React.useState(false);

  const visible = GROUPS.map((g) => ({
    ...g,
    entries: g.entries.filter((e) => e.permissions.some((p) => permissions.includes(p))),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="max-w-wide mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="font-serif text-lg">PAZ OS</span>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm lg:hidden"
              aria-expanded={open}
              aria-controls="admin-menu"
              onClick={() => setOpen((v) => !v)}
            >
              Menu
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {session?.user.email}
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="max-w-wide mx-auto flex w-full flex-1 flex-col gap-6 px-6 py-6 lg:flex-row lg:gap-10 lg:py-8">
        <nav
          id="admin-menu"
          aria-label="Admin"
          className={`${open ? "block" : "hidden"} lg:block lg:w-56 lg:shrink-0`}
        >
          <div className="flex flex-col gap-5">
            {visible.map((g) => (
              <div key={g.title}>
                <h2 className="text-muted-foreground mb-1 px-3 text-xs font-semibold uppercase tracking-wide">
                  {g.title}
                </h2>
                <ul className="flex flex-col">
                  {g.entries.map((entry) => (
                    <li key={entry.to}>
                      <NavLink
                        to={entry.to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `block rounded-md px-3 py-1.5 text-sm ${
                            isActive
                              ? "bg-muted font-medium"
                              : "text-muted-foreground hover:bg-muted"
                          }`
                        }
                      >
                        {entry.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
