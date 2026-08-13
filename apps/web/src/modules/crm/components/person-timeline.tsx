import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { usePersonTimeline, type PersonTimelineEvent } from "../api/use-crm";

const KIND_LABEL: Record<string, string> = {
  interaction: "Interaction",
  relationship_started: "Relationship started",
  relationship_ended: "Relationship ended",
  pledge: "Pledge",
  membership_application: "Membership application",
  membership_term: "Membership term",
  program_registration: "Programme registration",
  reservation: "Reservation",
};

/**
 * T-095/D-14. Every category here is visible only through its own
 * table's staff RLS policy (see 0044's comment) -- a viewer with narrower
 * permissions than the one who logged an event simply won't see it here,
 * same as everywhere else in this codebase that shape shows up.
 */
export function PersonTimeline({ personId }: { personId: string | undefined }) {
  const timeline = usePersonTimeline(personId);

  if (timeline.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (timeline.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {toAppError(timeline.error).message}
      </p>
    );
  }
  if (timeline.data.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing on record yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {timeline.data.map((event: PersonTimelineEvent, i: number) => (
        // No stable id in the unioned shape (each source row category has
        // its own primary key type) -- (kind, occurred_at, index) is
        // unique enough for a read-only list that's never reordered.
        <li key={`${event.kind}-${event.occurred_at}-${i}`} className="border-b pb-3 last:border-0">
          <p className="text-sm">{event.summary}</p>
          <p className="text-muted-foreground text-xs">
            {KIND_LABEL[event.kind] ?? event.kind} · {formatKathmanduDate(event.occurred_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
