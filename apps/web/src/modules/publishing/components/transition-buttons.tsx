import { Button } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAuthorization } from "@/modules/auth-core";
import {
  useTransitionItem,
  useDepositItem,
  type ItemStatus,
  type ItemType,
} from "../api/use-publishing";

interface Action {
  to: ItemStatus;
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

/** Series the Record indexes (spec §2) -- publishing.deposit_item()
 * rejects every other type, so these are the only ones offered "Deposit"
 * instead of a plain "Publish". */
const DEPOSIT_SERIES: ItemType[] = ["paper", "brief", "dispatch", "pigeon_post", "annual"];

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
  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
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
