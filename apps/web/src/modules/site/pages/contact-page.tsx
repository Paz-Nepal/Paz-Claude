import * as React from "react";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSubmitContactMessage } from "../api/use-site";

export function ContactPage() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const submit = useSubmitContactMessage();

  const canSubmit = fullName.trim() && email.trim() && message.trim();

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Contact</h1>
        <p className="text-muted-foreground">
          Write to us — a person reads every message. This isn&rsquo;t a live chat, so expect a
          reply by email rather than an instant response.
        </p>
      </header>

      {submit.isSuccess ? (
        <StatePanel
          title="Message sent."
          description="Thank you — we'll write back to the email address you gave us."
        />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            submit.mutate({ fullName, email, message });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="contact-name">
              <Input
                id="contact-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="contact-email">
              <Input
                id="contact-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Message" htmlFor="contact-message">
            <Textarea
              id="contact-message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          {submit.isError && (
            <p role="alert" className="text-destructive text-sm">
              {toAppError(submit.error).message}
            </p>
          )}
          <Button
            type="submit"
            loading={submit.isPending}
            disabled={!canSubmit}
            className="self-start"
          >
            Send message
          </Button>
        </form>
      )}
    </div>
  );
}
