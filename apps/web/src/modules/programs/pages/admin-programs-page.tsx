import { Link } from "react-router-dom";
import { Badge, Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAdminPrograms } from "../api/use-programs";

export function AdminProgramsPage() {
  const programs = useAdminPrograms();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">Programmes</h1>
        <Button asChild>
          <Link to="/admin/programmes/new">New programme</Link>
        </Button>
      </div>

      {programs.isPending && <p className="text-muted-foreground">Loading…</p>}
      {programs.isError && (
        <StatePanel
          title="Couldn't load programmes."
          description={toAppError(programs.error).message}
        />
      )}

      {programs.data &&
        (programs.data.length === 0 ? (
          <StatePanel
            title="No programmes yet."
            description="Create the first one to get started."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {programs.data.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/admin/programmes/${p.id}`}
                  className="hover:bg-muted flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">{p.title}</span>
                  <div className="flex items-center gap-2">
                    {p.member_only && <Badge variant="secondary">Members only</Badge>}
                    {!p.active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
