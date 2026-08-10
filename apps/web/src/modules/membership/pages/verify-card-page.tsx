import * as React from "react";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useVerifyCard } from "../api/use-membership";

/** T-083. Front-desk / hospitality tool: type the code a member reads
 * off their card (no scanner dependency, see member-card-page.tsx). */
export function VerifyCardPage() {
  const [token, setToken] = React.useState("");
  const verify = useVerifyCard();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Verify a member card</h1>

      <form
        className="flex max-w-md flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (token.trim()) verify.mutate(token.trim());
        }}
      >
        <Field label="Verification code" htmlFor="token">
          <Input
            id="token"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        {verify.isError && (
          <p role="alert" className="text-destructive text-sm">
            {toAppError(verify.error).message}
          </p>
        )}
        <Button type="submit" loading={verify.isPending} className="self-start">
          Verify
        </Button>
      </form>

      {verify.isSuccess &&
        (verify.data.found ? (
          <div
            className={`max-w-md rounded-lg border p-4 ${verify.data.valid ? "" : "border-destructive"}`}
          >
            <p className="font-medium">{verify.data.memberName}</p>
            <p className="text-muted-foreground text-sm">
              {verify.data.memberNo} · {verify.data.tierName}
            </p>
            <p className="mt-2 font-medium">
              {verify.data.valid
                ? "Valid membership"
                : `Not currently valid (${verify.data.status})`}
            </p>
          </div>
        ) : (
          <StatePanel title="Code not recognized." description="Check the code and try again." />
        ))}
    </div>
  );
}
