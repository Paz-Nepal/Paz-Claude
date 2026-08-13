import { QRCodeSVG } from "qrcode.react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useIssueCard, useMyMembership } from "../api/use-membership";
import { MemberStatusBadge } from "../components/member-status-badge";

/**
 * T-083. The QR encodes the raw verification code as plain text, nothing
 * more — a handheld scanner acting as a keyboard-wedge device just types
 * it into the same field verify-card-page's text input already reads, no
 * scanning-specific code needed on that side.
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
        <div className="flex flex-col items-start gap-4 rounded-lg border p-6 sm:flex-row sm:items-center">
          <QRCodeSVG
            value={issue.data.token}
            size={128}
            className="shrink-0"
            title="Membership verification code"
          />
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Verification code
            </p>
            <p className="font-mono text-3xl tracking-widest">{issue.data.token}</p>
            <p className="text-muted-foreground text-sm">
              Scan the code or show/read the text to staff. It&rsquo;s shown once here — issue a new
              one any time, which immediately stops the old one working.
            </p>
          </div>
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
