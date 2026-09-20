import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { usePublishedItems } from "@/modules/site";

/**
 * Sending the Brief. The Brief is the whole of the house's growth: one
 * list, the same letter to everyone, double opt-in, no segmentation, no
 * tracking, one-action unsubscribe. This page picks a deposited Brief and
 * sends it to the confirmed list. An issue can only ever be sent once, and
 * the list itself is never shown here: there is nothing to count or slice.
 */
export function AdminBriefPage() {
  const briefs = usePublishedItems("brief");
  const [slug, setSlug] = React.useState("");
  const send = useMutation({
    mutationFn: async (s: string) => invokeEdgeFunction<{ ok: true }>("brief-send", { slug: s }),
  });
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="font-serif text-2xl">The Brief</h1>
      <p className="text-muted-foreground text-sm">
        Choose a deposited Brief. It goes to everyone who has confirmed, the same letter, once. Open
        tracking and click rewriting must stay switched off in the mail provider&rsquo;s settings
        for the sending domain.
      </p>
      {briefs.isError && (
        <StatePanel
          title="Couldn't load the Briefs."
          description={toAppError(briefs.error).message}
        />
      )}
      <select
        aria-label="Brief to send"
        className="border-input bg-background h-10 rounded-lg border px-3"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      >
        <option value="">Choose a Brief</option>
        {(briefs.data ?? [])
          .filter((b) => b.deposit_ref)
          .map((b) => (
            <option key={b.id} value={b.slug ?? ""}>
              {b.title}
            </option>
          ))}
      </select>
      {send.isError && (
        <p role="alert" aria-live="assertive" className="text-destructive text-sm">
          {toAppError(send.error).message}
        </p>
      )}
      {send.isSuccess && (
        <p role="status" className="text-sm">
          Sent.
        </p>
      )}
      <Button
        type="button"
        loading={send.isPending}
        disabled={!slug}
        className="self-start"
        onClick={() => send.mutate(slug)}
      >
        Send to the list
      </Button>
    </div>
  );
}
