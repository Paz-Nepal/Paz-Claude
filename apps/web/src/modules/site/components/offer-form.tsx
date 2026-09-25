import * as React from "react";
import { Button, Field, Input, StatePanel, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSubmitOffer, type OfferKind } from "../api/use-place";
import { useWording, type WordingKey } from "../wording";
import { FormUnavailable, isUnavailable } from "./wall-parts";

/**
 * One question of an offer. `subject` and `note` are the two free fields every
 * offer has; anything else is kept under `ref` for the kind that asked it.
 */
export type OfferAsk = {
  key: "subject" | "note" | `ref.${string}`;
  label: WordingKey;
  hint?: WordingKey;
  type?: "text" | "textarea" | "date" | "select";
  options?: Array<{ value: string; label: WordingKey }>;
  required?: boolean;
};

const selectClass =
  "border-input bg-background text-foreground h-10 w-full rounded-lg border px-3 py-2 text-base";

/**
 * The public form behind every small offer to the house: a painter showing
 * their work, a Sattal proposal, a Table kept elsewhere, a thing or a book, a
 * word the house is looking for, a request to leave. Nothing here promises a
 * reply, a sitting or a place; it opens the door and says it has been
 * received (docs/website-additions.md G).
 */
export function OfferForm({
  kind,
  asks,
  idPrefix,
}: {
  kind: OfferKind;
  asks: OfferAsk[];
  idPrefix?: string;
}) {
  const w = useWording();
  const submit = useSubmitOffer();
  const prefix = idPrefix ?? `offer-${kind}`;
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const set = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const missing =
    !name.trim() ||
    !contact.trim() ||
    asks.some((a) => a.required && !(answers[a.key] ?? "").trim());

  if (submit.isSuccess) return <StatePanel title={w("common.received")} description="" />;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (missing) return;
        const ref: Record<string, string> = {};
        for (const a of asks) {
          const v = (answers[a.key] ?? "").trim();
          if (a.key.startsWith("ref.") && v) ref[a.key.slice(4)] = v;
        }
        submit.mutate({
          kind,
          name: name.trim(),
          contact: contact.trim(),
          subject: (answers["subject"] ?? "").trim() || undefined,
          note: (answers["note"] ?? "").trim() || undefined,
          ref,
        });
      }}
    >
      <Field label={w("offer.your-name")} htmlFor={`${prefix}-name`}>
        <Input id={`${prefix}-name`} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={w("offer.reach-you")} htmlFor={`${prefix}-contact`}>
        <Input
          id={`${prefix}-contact`}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </Field>
      {asks.map((a) => {
        const id = `${prefix}-${a.key.replace(/\./g, "-")}`;
        const value = answers[a.key] ?? "";
        return (
          <Field key={a.key} label={w(a.label)} htmlFor={id} hint={a.hint ? w(a.hint) : undefined}>
            {a.type === "textarea" ? (
              <Textarea
                id={id}
                rows={5}
                value={value}
                onChange={(e) => set(a.key, e.target.value)}
              />
            ) : a.type === "select" ? (
              <select
                id={id}
                className={selectClass}
                value={value}
                onChange={(e) => set(a.key, e.target.value)}
              >
                <option value="">{w("offer.choose")}</option>
                {(a.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {w(o.label)}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                type={a.type === "date" ? "date" : "text"}
                value={value}
                onChange={(e) => set(a.key, e.target.value)}
              />
            )}
          </Field>
        );
      })}
      {submit.isError &&
        (isUnavailable(submit.error) ? (
          <FormUnavailable />
        ) : (
          <p role="alert" aria-live="assertive" className="text-destructive text-sm">
            {toAppError(submit.error).message}
          </p>
        ))}
      <Button type="submit" loading={submit.isPending} disabled={missing} className="self-start">
        {w("common.send")}
      </Button>
    </form>
  );
}
