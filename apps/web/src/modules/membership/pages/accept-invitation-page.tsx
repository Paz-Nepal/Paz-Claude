import { useSearchParams } from "react-router-dom";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useAcceptInvitation } from "../api/use-membership";

/**
 * D-12. Deliberately requires a button click rather than accepting on
 * page load — a token consumed automatically by an email client's link
 * scanner/prefetcher (a real, common failure mode for single-use links)
 * would lock the real applicant out of their own invitation.
 */
export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const accept = useAcceptInvitation();

  if (!token) {
    return (
      <div className="max-w-reading mx-auto px-6 py-16">
        <StatePanel
          title="No invitation token."
          description="This link is missing its token — check that you copied the whole address from the email."
        />
      </div>
    );
  }

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Accept your invitation</h1>
        <p className="text-muted-foreground">
          Welcome — accepting sets up your membership record. You can pay whenever it&rsquo;s
          convenient; we&rsquo;ll be in touch about that separately.
        </p>
      </header>

      {accept.isSuccess ? (
        <StatePanel
          title="Welcome to PAZ."
          description={`Your member number is ${accept.data}. A person will follow up about payment and next steps.`}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {accept.isError && (
            <p role="alert" className="text-destructive text-sm">
              {toAppError(accept.error).message}
            </p>
          )}
          <Button
            type="button"
            loading={accept.isPending}
            disabled={accept.isPending}
            className="self-start"
            onClick={() => accept.mutate(token)}
          >
            Accept invitation
          </Button>
        </div>
      )}
    </div>
  );
}
