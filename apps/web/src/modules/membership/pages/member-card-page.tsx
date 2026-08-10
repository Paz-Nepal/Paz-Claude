import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useIssueCard, useMyMembership } from "../api/use-membership";
import { MemberStatusBadge } from "../components/member-status-badge";

/**
 * T-083. No QR/barcode rendering — no image-generation dependency is
 * available to add in this environment — so the verification code is
 * shown as text a member reads to staff or types into the verify tool.
 * See docs/adr/027-membership-digital-card.md "Still open".
 */
export function MemberCardPage() {
  const membership = useMyMembership();
  const issue = useIssueCard();

  if (membership.isPending) {
    return (
      <div className="max-w-standard mx-auto px-6 py-16">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (membership.isError) {
    return (
      <div className="max-w-standard mx-auto px-6 py-16">
        <StatePanel
          title="Couldn't load your card."
          description={toAppError(membership.error).message}
        />
      </div>
    );
  }

  if (!membership.data) {
    return (
      <div className="max-w-standard mx-auto px-6 py-16">
        <StatePanel
          title="No membership found."
          description="This page is for current members. If you believe this is a mistake, contact us."
        />
      </div>
    );
  }

  const m = membership.data;
  const canIssue = m.status === "active" || m.status === "honorary";

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">My card</h1>
        <p className="text-muted-foreground">
          Show the verification code below to staff, or read it aloud, to confirm your membership.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Member no.</p>
            <p className="font-serif text-2xl">{m.member_no}</p>
          </div>
          <MemberStatusBadge status={m.status} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Tier</p>
          <p>{m.tier_name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Member since</p>
          <p>{formatKathmanduDate(m.joined_on)}</p>
        </div>
      </div>

      {!canIssue && (
        <StatePanel
          title="Card unavailable."
          description="Only active or honorary members can issue a verification code. Contact us if your membership needs renewing."
        />
      )}

      {canIssue && issue.data && (
        <div className="flex flex-col gap-2 rounded-lg border p-6">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Verification code</p>
          <p className="font-mono text-3xl tracking-widest">{issue.data.token}</p>
          <p className="text-muted-foreground text-sm">
            This code is shown once. Issue a new one any time — the old code stops working
            immediately.
          </p>
        </div>
      )}

      {canIssue && (
        <div className="flex flex-col gap-2">
          {issue.isError && (
            <p role="alert" className="text-destructive text-sm">
              {toAppError(issue.error).message}
            </p>
          )}
          <Button
            type="button"
            loading={issue.isPending}
            className="self-start"
            onClick={() => issue.mutate()}
          >
            {m.card_issued_at ? "Issue a new code" : "Get my verification code"}
          </Button>
        </div>
      )}
    </div>
  );
}
