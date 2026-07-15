import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@paz/ui";
import { useAuthContext } from "@/lib/auth-context";
import { useAuthorization } from "@/modules/auth-core";

const NAV: Array<{ to: string; label: string; permission: string }> = [
  { to: "/admin/desk", label: "Desk", permission: "publishing.item.create" },
  { to: "/admin/media", label: "Media", permission: "publishing.media.read" },
  { to: "/admin/settings", label: "Settings", permission: "admin.settings.read" },
];

export function AdminLayout() {
  const { session, signOut } = useAuthContext();
  const { permissions } = useAuthorization();

  const visibleNav = NAV.filter((entry) => permissions.includes(entry.permission));

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
