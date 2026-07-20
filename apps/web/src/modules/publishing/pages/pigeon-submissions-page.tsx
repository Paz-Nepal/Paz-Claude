import { StatePanel, Badge, Button } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { usePigeonSubmissions, useMarkPigeonSubmissionReviewed } from "../api/use-publishing";

/**
 * The private inbox behind "send a pigeon" (spec §2/§3) — reviewed by
 * hand, never auto-published. Nothing here is exposed to the public site;
 * this page exists only inside /admin.
 */
export function PigeonSubmissionsPage() {
  const submissions = usePigeonSubmissions();
  const markReviewed = useMarkPigeonSubmissionReviewed();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Send a pigeon — inbox</h1>

      {submissions.isPending && <p className="text-muted-foreground">Loading…</p>}
      {submissions.isError && (
        <StatePanel
          title="Couldn't load submissions."
          description={toAppError(submissions.error).message}
        />
      )}

      {submissions.data &&
        (submissions.data.length === 0 ? (
          <StatePanel title="Nothing sent yet." description="" />
        ) : (
          <ul className="flex flex-col gap-3">
            {submissions.data.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="whitespace-pre-line">{s.content}</p>
                  <Badge variant={s.reviewed ? "outline" : "default"} className="shrink-0">
                    {s.reviewed ? "Reviewed" : "New"}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    {s.contributor_name ?? "Anonymous"}
                    {s.contributor_contact ? ` · ${s.contributor_contact}` : ""}
                    {s.submitted_at ? ` · ${formatKathmanduDate(s.submitted_at)}` : ""}
                  </span>
                  {!s.reviewed && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      loading={markReviewed.isPending}
                      onClick={() => s.id && markReviewed.mutate(s.id)}
                    >
                      Mark reviewed
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
