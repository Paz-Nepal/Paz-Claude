import type * as React from "react";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents, formatKathmanduDate } from "@paz/utils";
import { useAuthorization } from "@/modules/auth-core";
import {
  useEditorialPipeline,
  useProgramFill,
  useMembershipFunnel,
  useReservationLoad,
  useFinanceSummary,
  useInstitutionVitals,
} from "../api/use-analytics";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="font-serif text-lg">{title}</h2>
      {children}
    </section>
  );
}

function metricLabel(metric: string): string {
  return metric.replace(/_/g, " ");
}

export function DashboardPage() {
  const { permissions } = useAuthorization();

  const canEditorial = permissions.includes("analytics.dashboard.editorial");
  const canPrograms = permissions.includes("analytics.dashboard.programs");
  const canMembership = permissions.includes("analytics.dashboard.membership");
  const canHospitality = permissions.includes("analytics.dashboard.hospitality");
  const canFinance = permissions.includes("analytics.dashboard.finance");
  const canVitals = permissions.includes("analytics.dashboard.vitals");

  const editorial = useEditorialPipeline(canEditorial);
  const programs = useProgramFill(canPrograms);
  const membership = useMembershipFunnel(canMembership);
  const reservations = useReservationLoad(canHospitality);
  const finance = useFinanceSummary(canFinance);
  const vitals = useInstitutionVitals(canVitals);

  const nothingToShow =
    !canEditorial && !canPrograms && !canMembership && !canHospitality && !canFinance && !canVitals;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Dashboard</h1>

      {nothingToShow && (
        <StatePanel title="Nothing here yet." description="Your role has no dashboards assigned." />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {canVitals && (
          <Card title="Institution vitals">
            {vitals.isError && (
              <p className="text-destructive text-sm">{toAppError(vitals.error).message}</p>
            )}
            {vitals.data && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {vitals.data.map((row) => (
                  <div key={row.metric}>
                    <dt className="text-muted-foreground capitalize">
                      {metricLabel(row.metric ?? "")}
                    </dt>
                    <dd className="text-lg font-medium">{row.metric_count}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        )}

        {canEditorial && (
          <Card title="Editorial pipeline">
            {editorial.isError && (
              <p className="text-destructive text-sm">{toAppError(editorial.error).message}</p>
            )}
            {editorial.data &&
              (editorial.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing in the pipeline.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {editorial.data.map((row, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {row.item_type} · {row.status}
                      </span>
                      <span className="font-medium">{row.item_count}</span>
                    </li>
                  ))}
                </ul>
              ))}
          </Card>
        )}

        {canPrograms && (
          <Card title="Upcoming session fill">
            {programs.isError && (
              <p className="text-destructive text-sm">{toAppError(programs.error).message}</p>
            )}
            {programs.data &&
              (programs.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming scheduled sessions.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {programs.data.map((row) => (
                    <li key={row.session_id} className="flex justify-between">
                      <span>
                        {row.program_title}
                        {row.starts_at && ` · ${formatKathmanduDate(row.starts_at)}`}
                      </span>
                      <span className="font-medium">
                        {row.registered_count}/{row.capacity} ({row.fill_pct}%)
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
          </Card>
        )}

        {canMembership && (
          <Card title="Membership funnel">
            {membership.isError && (
              <p className="text-destructive text-sm">{toAppError(membership.error).message}</p>
            )}
            {membership.data && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {membership.data.map((row) => (
                  <div key={row.metric}>
                    <dt className="text-muted-foreground capitalize">
                      {metricLabel(row.metric ?? "")}
                    </dt>
                    <dd className="text-lg font-medium">{row.metric_count}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        )}

        {canHospitality && (
          <Card title="Reservation load (next 30 days)">
            {reservations.isError && (
              <p className="text-destructive text-sm">{toAppError(reservations.error).message}</p>
            )}
            {reservations.data &&
              (reservations.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No reservations in this window.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {reservations.data.map((row) => (
                    <li key={row.day} className="flex justify-between">
                      <span>{row.day && formatKathmanduDate(row.day)}</span>
                      <span className="text-muted-foreground">
                        {row.requested} requested · {row.confirmed} confirmed
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
          </Card>
        )}

        {canFinance && (
          <Card title="Financial summary (year to date)">
            {finance.isError && (
              <p className="text-destructive text-sm">{toAppError(finance.error).message}</p>
            )}
            {finance.data && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {finance.data.map((row) => (
                  <div key={row.metric}>
                    <dt className="text-muted-foreground capitalize">
                      {metricLabel(row.metric ?? "")}
                    </dt>
                    <dd className="text-lg font-medium">
                      {row.cents != null ? formatCents(row.cents) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
