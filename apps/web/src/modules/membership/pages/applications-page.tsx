import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useApplications } from "../api/use-membership";
import { ApplicationRow } from "../components/application-row";

export function ApplicationsPage() {
  const applications = useApplications();
  const pending = (applications.data ?? []).filter((a) => a.status === "pending");
  const decided = (applications.data ?? []).filter((a) => a.status !== "pending");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl">Membership applications</h1>

      {applications.isPending && <p className="text-muted-foreground">Loading…</p>}
      {applications.isError && (
        <StatePanel
          title="Couldn't load applications."
          description={toAppError(applications.error).message}
        />
      )}

      {applications.data && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
              Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-muted-foreground">Nothing waiting on a decision.</p>
            ) : (
              <ul>
                {pending.map((a) => (
                  <ApplicationRow
                    key={a.id}
                    id={a.id ?? ""}
                    name={a.applicant_name}
                    email={a.applicant_email}
                    tierKey={a.tier_key}
                    motivation={a.motivation}
                  />
                ))}
              </ul>
            )}
          </section>

          {decided.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                Decided
              </h2>
              <ul className="text-sm">
                {decided.map((a) => (
                  <li key={a.id} className="flex justify-between border-b py-2 last:border-0">
                    <span>
                      {a.applicant_name} · {a.tier_key}
                    </span>
                    <span className="text-muted-foreground capitalize">{a.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
