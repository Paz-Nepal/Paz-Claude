import * as React from "react";
import { Badge, Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { useAdminOffers, useReviewOffer } from "../api/use-house-admin";

const KIND_LABEL: Record<string, string> = {
  painter: "A painter showing their work",
  sattal: "A Sattal proposal",
  table: "A Table kept elsewhere",
  thing: "A thing for the house",
  book: "A book for the reading room",
  word: "A word the house is looking for",
  leaving: "A request to leave",
};

const REF_LABEL: Record<string, string> = {
  link: "Link",
  form: "Form",
  relation: "Relation to the subject",
  held_on: "Held on",
  author: "Author",
  what: "Asking",
};

/**
 * Everything the public has offered the house through the one intake. Each
 * kind is readable only by whoever holds the permission for that part of the
 * house, so what appears here depends on who is signed in. Nothing is sent
 * out from here: reading an offer and answering it are the house's own work.
 */
export function AdminOffersPage() {
  const offers = useAdminOffers();
  const review = useReviewOffer();
  const [kind, setKind] = React.useState("");
  const [showRead, setShowRead] = React.useState(false);

  const kinds = [...new Set((offers.data ?? []).map((o) => o.kind ?? ""))].filter(Boolean);
  const shown = (offers.data ?? []).filter(
    (o) => (!kind || o.kind === kind) && (showRead || !o.reviewed_at),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl">Offers</h1>
        <p className="text-muted-foreground text-sm">
          What people have offered or asked of the house through the site. You see the kinds that
          belong to the parts of the house you keep. Marking one read only tidies this list.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Kind
          <select
            className="border-input bg-background h-9 rounded-lg border px-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">All</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k] ?? k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showRead}
            onChange={(e) => setShowRead(e.target.checked)}
          />
          Show those already read
        </label>
      </div>
      {offers.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {offers.isError && (
        <StatePanel
          title="Couldn't load the offers."
          description={toAppError(offers.error).message}
        />
      )}
      {offers.data && shown.length === 0 && <StatePanel title="Nothing here." description="" />}
      <ul className="flex flex-col gap-3">
        {shown.map((o) => (
          <li key={o.id} className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{KIND_LABEL[o.kind ?? ""] ?? o.kind}</Badge>
              {o.reviewed_at && <Badge variant="outline">Read</Badge>}
              <span className="text-muted-foreground">
                {o.created_at ? formatKathmanduDate(o.created_at) : ""}
              </span>
            </div>
            <p className="font-medium">
              {o.name} · {o.contact}
            </p>
            {o.subject && <p>{o.subject}</p>}
            {Object.entries((o.ref ?? {}) as Record<string, unknown>).map(([k, v]) => (
              <p key={k}>
                <span className="text-muted-foreground">{REF_LABEL[k] ?? k}:</span> {String(v)}
              </p>
            ))}
            {o.note && <p className="whitespace-pre-line">{o.note}</p>}
            {!o.reviewed_at && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="self-start"
                loading={review.isPending}
                onClick={() => review.mutate({ p_id: o.id })}
              >
                Mark as read
              </Button>
            )}
          </li>
        ))}
      </ul>
      {review.error != null && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(review.error).message}
        </p>
      )}
    </div>
  );
}
