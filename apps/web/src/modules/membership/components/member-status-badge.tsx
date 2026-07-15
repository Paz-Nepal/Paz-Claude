import { Badge } from "@paz/ui";
import type { Member } from "../api/use-membership";

const LABEL: Record<NonNullable<Member["status"]>, string> = {
  active: "Active",
  lapsed: "Lapsed",
  paused: "Paused",
  resigned: "Resigned",
  honorary: "Honorary",
};

const VARIANT: Record<NonNullable<Member["status"]>, "outline" | "secondary" | "default"> = {
  active: "default",
  honorary: "default",
  paused: "secondary",
  lapsed: "outline",
  resigned: "outline",
};

export function MemberStatusBadge({ status }: { status: Member["status"] }) {
  if (!status) return null;
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
