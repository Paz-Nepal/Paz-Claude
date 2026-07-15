import { Badge } from "@paz/ui";
import type { ItemStatus } from "../api/use-publishing";

const LABEL: Record<ItemStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

const VARIANT: Record<ItemStatus, "outline" | "secondary" | "default"> = {
  draft: "outline",
  in_review: "secondary",
  published: "default",
  archived: "outline",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
