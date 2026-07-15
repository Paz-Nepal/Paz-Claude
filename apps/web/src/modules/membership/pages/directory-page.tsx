import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useMemberDirectory } from "../api/use-membership";

export function DirectoryPage() {
  const directory = useMemberDirectory();

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl">Members</h1>
        <p className="text-muted-foreground">
          The members who&rsquo;ve chosen to appear here. Most members keep their support private —
          this list is opt-in.
        </p>
      </div>
      {directory.isPending && <p className="text-muted-foreground text-center">Loading…</p>}
      {directory.isError && (
        <StatePanel
          title="Couldn't load the directory."
          description={toAppError(directory.error).message}
        />
      )}
      {directory.data &&
        (directory.data.length === 0 ? (
          <StatePanel title="No one has opted in yet." description="Check back later." />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {directory.data.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-3 text-center">
                {entry.display_name}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
