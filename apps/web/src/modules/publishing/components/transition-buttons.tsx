import * as React from "react";
import { Button, Input } from "@paz/ui";
import { toAppError } from "@paz/types";
import { kathmanduInputToUtcIso } from "@paz/utils";
import { useAuthorization } from "@/modules/auth-core";
import {
  useTransitionItem,
  useScheduleItem,
  useDepositItem,
  type ItemStatus,
  type ItemType,
} from "../api/use-publishing";

interface Action {
  // 'scheduled' is never a plain click target -- ScheduleControl (below)
  // is the only path into it, since it needs a time input first.
  to: Exclude<ItemStatus, "scheduled">;
  label: string;
  /** Permission the UI checks; the state machine re-checks server-side. */
  permission: string;
  variant: "primary" | "secondary" | "danger";
}

/**
 * Mirrors the legal edges of publishing.transition_item(). "Submit for
 * review" is offered on the author's own drafts under item.create; the
 * database enforces the ownership half of that rule.
 */
const ACTIONS: Record<ItemStatus, Action[]> = {
  draft: [
    {
      to: "in_review",
      label: "Submit for review",
      permission: "publishing.item.create",
      variant: "secondary",
    },
    {
      to: "published",
      label: "Publish",
      permission: "publishing.item.publish",
      variant: "primary",
    },
  ],
  in_review: [
    {
      to: "draft",
      label: "Send back to draft",
      permission: "publishing.item.update",
      variant: "secondary",
    },
    {
      to: "published",
      label: "Publish",
      permission: "publishing.item.publish",
      variant: "primary",
    },
  ],
  scheduled: [
    {
      to: "draft",
      label: "Cancel schedule",
      permission: "publishing.item.update",
      variant: "secondary",
    },
    {
      to: "published",
      label: "Publish now",
      permission: "publishing.item.publish",
      variant: "primary",
    },
  ],
  published: [
    { to: "archived", label: "Archive", permission: "publishing.item.archive", variant: "danger" },
  ],
  archived: [
    {
      to: "published",
      label: "Restore to published",
      permission: "publishing.item.publish",
      variant: "primary",
    },
  ],
};

/** T-061. Not offered via the plain ACTIONS map above because scheduling
 * needs an input (the target time) before the transition itself, not
 * just a click. */
function ScheduleControl({ itemId }: { itemId: string }) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const schedule = useScheduleItem();

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Schedule…
      </Button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        schedule.mutate(
          { id: itemId, scheduledFor: kathmanduInputToUtcIso(value) },
          { onSuccess: () => setOpen(false) },
        );
      }}
    >
      <label htmlFor="schedule-for" className="text-muted-foreground text-sm">
        Publish at (Asia/Kathmandu)
      </label>
      <Input
        id="schedule-for"
        type="datetime-local"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit" size="sm" loading={schedule.isPending}>
        Confirm
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {schedule.isError && (
        <p role="alert" className="text-destructive w-full text-sm">
          {toAppError(schedule.error).message}
        </p>
      )}
    </form>
  );
}

/** Series the Record indexes (spec §2) -- publishing.deposit_item()
 * rejects every other type, so these are the only ones offered "Deposit"
 * instead of a plain "Publish". */
export const DEPOSIT_SERIES: ItemType[] = ["paper", "brief", "dispatch", "pigeon_post", "annual"];

export function TransitionButtons({
  itemId,
  status,
  type,
}: {
  itemId: string;
  status: ItemStatus;
  type: ItemType;
}) {
  const { permissions } = useAuthorization();
  const transition = useTransitionItem();
  const deposit = useDepositItem();
  const isDepositSeries = DEPOSIT_SERIES.includes(type);

  const available = ACTIONS[status].filter((a) => permissions.includes(a.permission));
  // Scheduling is offered only for non-deposit types: api.publish_scheduled_items
  // (the automated job) publishes a scheduled item with a plain status
  // update, not through publishing.deposit_item() -- which needs a
  // signed-in human actor (it calls transition_item internally) and so
  // can't run from an unattended service-role job. A deposit-series item
  // published that way would end up "published" with no deposit_ref and
  // no Record entry, so scheduling those stays a manual "Publish" for now.
  const canSchedule =
    !isDepositSeries &&
    (status === "draft" || status === "in_review") &&
    permissions.includes("publishing.item.publish");
  if (available.length === 0 && !canSchedule) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSchedule && <ScheduleControl itemId={itemId} />}
      {available.map((action) => {
        // draft/in_review -> published is a deposit for the five series
        // with a Record; every other edge (including archive/restore)
        // stays a plain state transition.
        const isDeposit =
          isDepositSeries &&
          action.to === "published" &&
          (status === "draft" || status === "in_review");

        return (
          <Button
            key={action.to}
            type="button"
            variant={action.variant}
            loading={
              isDeposit
                ? deposit.isPending
                : transition.isPending && transition.variables?.to === action.to
            }
            disabled={transition.isPending || deposit.isPending}
            onClick={() =>
              isDeposit ? deposit.mutate(itemId) : transition.mutate({ id: itemId, to: action.to })
            }
          >
            {isDeposit ? "Deposit" : action.label}
          </Button>
        );
      })}
      {transition.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(transition.error).message}
        </p>
      )}
      {deposit.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(deposit.error).message}
        </p>
      )}
    </div>
  );
}
