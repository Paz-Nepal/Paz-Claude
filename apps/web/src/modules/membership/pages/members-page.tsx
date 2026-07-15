import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useMembers } from "../api/use-membership";
import { MemberStatusBadge } from "../components/member-status-badge";

export function MembersPage() {
  const members = useMembers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Members</h1>

      {members.isPending && <p className="text-muted-foreground">Loading…</p>}
      {members.isError && (
        <StatePanel
          title="Couldn't load members."
          description={toAppError(members.error).message}
        />
      )}

      {members.data &&
        (members.data.length === 0 ? (
          <StatePanel title="No members yet." description="Accepted applications appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">Member no.</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Tier</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.data.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link to={`/admin/members/${m.id}`} className="font-medium hover:underline">
                        {m.member_no}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{m.member_name}</td>
                    <td className="text-muted-foreground py-3 pr-4">{m.tier_key}</td>
                    <td className="py-3 pr-4">
                      <MemberStatusBadge status={m.status} />
                    </td>
                    <td className="text-muted-foreground py-3">{m.joined_on}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
