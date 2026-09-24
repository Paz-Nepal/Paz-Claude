import * as React from "react";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSendAPigeon } from "../api/use-site";
import { useWording } from "../wording";

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
  const w = useWording();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{w("pigeon.title")}</h1>
        <p className="text-muted-foreground">{w("pigeon.intro")}</p>
      </header>

      {send.isSuccess ? (
        <StatePanel title={w("pigeon.sent")} description={w("pigeon.sent-note")} />
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
          <Field label={w("pigeon.noticed")} htmlFor="pigeon-content">
            <Textarea
              id="pigeon-content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={w("pigeon.name")} htmlFor="pigeon-name" hint={w("pigeon.private")}>
              <Input id="pigeon-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={w("pigeon.contact")} htmlFor="pigeon-contact" hint={w("pigeon.private")}>
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
            {w("common.send")}
          </Button>
        </form>
      )}
    </div>
  );
}
