import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents, formatKathmanduDate } from "@paz/utils";
import {
  useMembers,
  useMemberTerms,
  useRecordPayment,
  useSetMemberStatus,
  type Member,
} from "../api/use-membership";
import { MemberStatusBadge } from "../components/member-status-badge";

const STATUS_OPTIONS: NonNullable<Member["status"]>[] = [
  "active",
  "paused",
  "lapsed",
  "resigned",
  "honorary",
];

function PaymentForm({ termId, memberId }: { termId: string; memberId: string }) {
  const [amount, setAmount] = React.useState("");
  const record = useRecordPayment(memberId);

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = Math.round(Number(amount) * 100);
        if (!Number.isFinite(cents) || cents < 0) return;
        record.mutate({ termId, amountCents: cents });
      }}
    >
      <Field label="Amount received" htmlFor={`amount-${termId}`}>
        <Input
          id={`amount-${termId}`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
      </Field>
      <Button type="submit" size="sm" loading={record.isPending}>
        Record payment
      </Button>
      {record.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(record.error).message}
        </p>
      )}
    </form>
  );
}

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const members = useMembers();
  const terms = useMemberTerms(id);
  const setStatus = useSetMemberStatus();

  const member = members.data?.find((m) => m.id === id);

  if (members.isPending) return <p className="text-muted-foreground">Loading…</p>;
  if (!member) {
    return <StatePanel title="Member not found." description="It may have been removed." />;
  }

  return (
    <div className="max-w-standard flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Link to="/admin/members" className="text-muted-foreground text-sm hover:underline">
          ← Members
        </Link>
        <h1 className="font-serif text-2xl">{member.member_name}</h1>
        <MemberStatusBadge status={member.status} />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <p>
          <span className="text-muted-foreground">Member no.</span> {member.member_no}
        </p>
        <p>
          <span className="text-muted-foreground">Email</span> {member.member_email}
        </p>
        <p>
          <span className="text-muted-foreground">Tier</span> {member.tier_key}
        </p>
        <p>
          <span className="text-muted-foreground">Joined</span>{" "}
          {member.joined_on ? formatKathmanduDate(member.joined_on) : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Status</span>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={member.status === status ? "primary" : "ghost"}
              disabled={member.status === status || setStatus.isPending}
              onClick={() => id && setStatus.mutate({ id, status })}
            >
              {status}
            </Button>
          ))}
        </div>
        {setStatus.isError && (
          <p role="alert" className="text-destructive text-sm">
            {toAppError(setStatus.error).message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Terms</span>
        {terms.data && terms.data.length === 0 && (
          <p className="text-muted-foreground text-sm">No terms yet.</p>
        )}
        {terms.data?.map((term) => (
          <div key={term.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex justify-between text-sm">
              <span>
                {formatKathmanduDate(term.starts_on)} – {formatKathmanduDate(term.ends_on)}
              </span>
              <span className={term.paid_at ? "text-foreground" : "text-destructive"}>
                {term.paid_at ? `Paid ${formatCents(term.amount_cents)}` : "Unpaid"}
              </span>
            </div>
            {!term.paid_at && member.id && <PaymentForm termId={term.id} memberId={member.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
