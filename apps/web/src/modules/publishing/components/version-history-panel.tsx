import * as React from "react";
import { Badge, Button, RichText, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { useItemRevision, useItemRevisions, useRestoreItemRevision } from "../api/use-publishing";
import { RevisionDiff } from "./revision-diff";

/**
 * T-060, structural diff added for T-037. Each revision shows both its
 * full rendered content and a block-level diff against the revision
 * immediately before it (see revision-diff.tsx for what "structural"
 * means here), so an editor can restore it as the item's current content
 * (which itself becomes a new revision, never rewriting history).
 */
export function VersionHistoryPanel({ itemId }: { itemId: string }) {
  const revisions = useItemRevisions(itemId);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const preview = useItemRevision(openId ?? undefined);
  const openIndex = revisions.data?.findIndex((r) => r.id === openId) ?? -1;
  const prevRevisionId = openIndex >= 0 ? revisions.data?.[openIndex + 1]?.id : undefined;
  const prevPreview = useItemRevision(prevRevisionId);
  const restore = useRestoreItemRevision(itemId);

  if (revisions.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (revisions.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {toAppError(revisions.error).message}
      </p>
    );
  }
  if (revisions.data.length === 0) {
    return <p className="text-muted-foreground text-sm">No revision history yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {revisions.data.map((rev, i) => {
        const isLatest = i === 0;
        const isOpen = openId === rev.id;
        return (
          <li key={rev.id} className="rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-3 text-left"
              onClick={() => setOpenId(isOpen ? null : rev.id)}
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="font-medium">Revision {rev.revision_no}</span>
                <Badge variant="outline">{rev.kind}</Badge>
                {isLatest && <Badge>Current</Badge>}
              </span>
              <span className="text-muted-foreground text-xs">
                {rev.created_by_name} · {formatKathmanduTime(rev.created_at)}
              </span>
            </button>

            {rev.notes && (
              <p className="text-muted-foreground border-t px-3 py-2 text-sm italic">
                “{rev.notes}”
              </p>
            )}

            {isOpen && (
              <div className="flex flex-col gap-3 border-t p-3">
                {preview.isPending && <p className="text-muted-foreground text-sm">Loading…</p>}
                {preview.data && (
                  <>
                    <p className="font-serif text-lg">{preview.data.title}</p>
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs uppercase">
                        {prevRevisionId
                          ? "Changed from the previous revision"
                          : "First recorded revision"}
                      </p>
                      {prevRevisionId && prevPreview.isPending ? (
                        <p className="text-muted-foreground text-sm">Loading…</p>
                      ) : (
                        <RevisionDiff
                          title={preview.data.title}
                          prevTitle={prevRevisionId ? prevPreview.data?.title : undefined}
                          body={preview.data.body as RichTextNode}
                          prevBody={
                            prevRevisionId ? (prevPreview.data?.body as RichTextNode) : undefined
                          }
                        />
                      )}
                    </div>
                    <details>
                      <summary className="text-muted-foreground cursor-pointer text-xs uppercase">
                        Full rendered content
                      </summary>
                      <div className="mt-2 max-h-64 overflow-y-auto rounded border p-3">
                        <RichText
                          doc={preview.data.body as RichTextNode}
                          className="rich-text text-sm"
                        />
                      </div>
                    </details>
                    {!isLatest && (
                      <>
                        {restore.isError && (
                          <p role="alert" className="text-destructive text-sm">
                            {toAppError(restore.error).message}
                          </p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="self-start"
                          loading={restore.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Restore this version as the item's current content? This becomes a new revision — nothing is lost.",
                              )
                            ) {
                              restore.mutate(rev.id, {
                                // ItemEditorForm's fields are initialized once at mount
                                // from `existing` and won't pick up the restored
                                // content from a query invalidation alone — a reload is
                                // the simplest correct way to show it, and restoring an
                                // old version is rare enough not to need more than that.
                                onSuccess: () => window.location.reload(),
                              });
                            }
                          }}
                        >
                          Restore this version
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
