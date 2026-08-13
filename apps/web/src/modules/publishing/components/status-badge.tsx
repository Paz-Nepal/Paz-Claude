import { Badge } from "@paz/ui";
import type { ItemStatus } from "../api/use-publishing";

const LABEL: Record<ItemStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const VARIANT: Record<ItemStatus, "outline" | "secondary" | "default"> = {
  draft: "outline",
  in_review: "secondary",
  scheduled: "secondary",
  published: "default",
  archived: "outline",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
