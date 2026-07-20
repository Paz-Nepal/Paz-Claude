import * as React from "react";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSendAPigeon } from "../api/use-site";

/**
 * "A simple, non-tracking submission route — content goes to house staff,
 * not published automatically" (spec §2/§3). No name/contact field is
 * required; if given, it is stored for the house's own private records
 * only and never surfaces publicly (same anonymity rule as the published
 * series itself).
 */
export function SendAPigeonPage() {
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [content, setContent] = React.useState("");
  const send = useSendAPigeon();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Send a pigeon</h1>
        <p className="text-muted-foreground">
          The art of noticing. Send us something you noticed — a moment, a detail, a small truth.
          The house reads every one; not everything finds its way into print, and nothing is
          published without care.
        </p>
      </header>

      {send.isSuccess ? (
        <StatePanel title="Sent." description="Thank you. The house has received it." />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!content.trim()) return;
            send.mutate({
              contributorName: name || null,
              contributorContact: contact || null,
              content,
            });
          }}
        >
          <Field label="What you noticed" htmlFor="pigeon-content">
            <Textarea
              id="pigeon-content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="pigeon-name" hint="Optional. Kept private.">
              <Input id="pigeon-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Contact" htmlFor="pigeon-contact" hint="Optional. Kept private.">
              <Input
                id="pigeon-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>
          </div>
          {send.isError && (
            <p role="alert" className="text-destructive text-sm">
              {toAppError(send.error).message}
            </p>
          )}
          <Button
            type="submit"
            loading={send.isPending}
            disabled={!content.trim()}
            className="self-start"
          >
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
