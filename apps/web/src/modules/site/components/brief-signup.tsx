import * as React from "react";
import { Button, Field, Input } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useSubscribeBrief } from "../api/use-house";
import { FormUnavailable, isUnavailable } from "./wall-parts";
import { useWording } from "../wording";

/**
 * The Brief is the whole of the house's growth, so its subscription is the
 * most load-bearing control on the site (Build Programme 13). It sits where
 * a person finishes reading. One list, the same letter to everyone, double
 * opt-in, no segmentation, no tracking, one-action unsubscribe. It is the
 * only thing on the site that asks the reader for anything.
 */
export function BriefSignup() {
  const [email, setEmail] = React.useState("");
  const subscribe = useSubscribeBrief();
  const w = useWording();

  if (subscribe.isSuccess) {
    return (
      <p role="status" className="type-small">
        {w("brief.sent")}
      </p>
    );
  }

  return (
    <form
      aria-labelledby="brief-signup-h"
      className="border-border flex max-w-md flex-col gap-3 border-t pt-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) subscribe.mutate(email.trim());
      }}
    >
      <h2 id="brief-signup-h" className="type-h4">
        {w("brief.signup-heading")}
      </h2>
      <Field label={w("brief.email")} htmlFor="brief-email">
        <Input
          id="brief-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {subscribe.isError &&
        (isUnavailable(subscribe.error) ? (
          <FormUnavailable />
        ) : (
          <p role="alert" aria-live="assertive" className="text-destructive text-sm">
            {toAppError(subscribe.error).message}
          </p>
        ))}
      <Button
        type="submit"
        loading={subscribe.isPending}
        disabled={!email.trim()}
        className="self-start"
      >
        {w("brief.subscribe")}
      </Button>
    </form>
  );
}
