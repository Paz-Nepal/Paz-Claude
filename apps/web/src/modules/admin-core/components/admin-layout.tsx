import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@paz/ui";
import { useAuthContext } from "@/lib/auth-context";
import { useAuthorization } from "@/modules/auth-core";

const DASHBOARD_PERMISSIONS = [
  "analytics.dashboard.editorial",
  "analytics.dashboard.programs",
  "analytics.dashboard.membership",
  "analytics.dashboard.hospitality",
  "analytics.dashboard.finance",
  "analytics.dashboard.vitals",
];

const NAV: Array<{ to: string; label: string; permissions: string[] }> = [
  { to: "/admin/dashboard", label: "Dashboard", permissions: DASHBOARD_PERMISSIONS },
  { to: "/admin/desk", label: "Desk", permissions: ["publishing.item.create"] },
  {
    to: "/admin/pigeon-submissions",
    label: "Send a pigeon",
    permissions: ["publishing.item.read"],
  },
  { to: "/admin/media", label: "Media", permissions: ["publishing.media.read"] },
  {
    to: "/admin/applications",
    label: "Applications",
    permissions: ["membership.application.read"],
  },
  { to: "/admin/members", label: "Members", permissions: ["membership.member.read"] },
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
  {
    to: "/admin/hospitality/desk",
    label: "Reservations",
    permissions: ["hospitality.reservation.read"],
  },
  {
    to: "/admin/hospitality/tables",
    label: "Tables",
    permissions: ["hospitality.service.manage"],
  },
  { to: "/admin/hospitality/menu", label: "Menu", permissions: ["hospitality.menu.manage"] },
  { to: "/admin/settings", label: "Settings", permissions: ["admin.settings.read"] },
];

export function AdminLayout() {
  const { session, signOut } = useAuthContext();
  const { permissions } = useAuthorization();

  const visibleNav = NAV.filter((entry) => entry.permissions.some((p) => permissions.includes(p)));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="max-w-wide mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-serif text-lg">PAZ OS</span>
            <nav aria-label="Admin" className="flex gap-1">
              {visibleNav.map((entry) => (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm ${
                      isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                    }`
                  }
                >
                  {entry.label}
                </NavLink>
              ))}
            </nav>
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
      <main className="max-w-wide mx-auto w-full flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
