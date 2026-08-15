import * as React from "react";
import { Button, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { flattenBlocks } from "../lib/revision-diff";
import {
  useItemComments,
  useAddItemComment,
  useResolveItemComment,
  type ItemComment,
} from "../api/use-publishing";

export interface CommentsPanelProps {
  itemId: string;
  body: RichTextNode | null | undefined;
}

/**
 * T-059 (the half ADR-35 left open): inline comments anchored to a
 * block in the document, reusing flattenBlocks (revision-diff.ts) for
 * the same block-splitting logic the structural diff already uses.
 *
 * Anchor resolution: each comment carries the block index it was left
 * on *and* a text snapshot of that block at the time. On render, an
 * exact index match is tried first (the fast, common case); if the
 * block currently at that index doesn't match the snapshot (something
 * was inserted/removed/reordered elsewhere), the whole document is
 * searched for a block with matching text instead. A comment whose
 * anchor text no longer appears anywhere is never dropped -- it's shown
 * under "Comments on removed content," still visible, never silently
 * lost.
 */
export function CommentsPanel({ itemId, body }: CommentsPanelProps) {
  const comments = useItemComments(itemId);
  const addComment = useAddItemComment(itemId);
  const resolveComment = useResolveItemComment(itemId);
  const [openBlockIndex, setOpenBlockIndex] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState("");

  const blocks = React.useMemo(() => flattenBlocks(body), [body]);

  const { byBlockIndex, unanchored } = React.useMemo(() => {
    const map = new Map<number, ItemComment[]>();
    const orphans: ItemComment[] = [];
    for (const c of comments.data ?? []) {
      const atIndex = blocks[c.block_index];
      const targetIndex =
        atIndex && atIndex.text === c.anchor_text
          ? c.block_index
          : blocks.findIndex((b) => b.text === c.anchor_text);

      if (targetIndex < 0) {
        orphans.push(c);
        continue;
      }
      const list = map.get(targetIndex) ?? [];
      list.push(c);
      map.set(targetIndex, list);
    }
    return { byBlockIndex: map, unanchored: orphans };
  }, [comments.data, blocks]);

  if (comments.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (comments.isError) {
    return (
      <StatePanel
        title="Couldn't load comments."
        description={toAppError(comments.error).message}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && (
        <p className="text-muted-foreground text-sm">Nothing to comment on yet.</p>
      )}
      {blocks.map((block, i) => {
        if (block.text.trim() === "") return null;
        const blockComments = byBlockIndex.get(i) ?? [];
        const isOpen = openBlockIndex === i;
        return (
          <div key={i} className="rounded-lg border p-3">
            <p className="text-sm">{block.text}</p>

            {blockComments.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2 border-t pt-2">
                {blockComments.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">
                        {c.author_name ?? "Someone"} · {new Date(c.created_at).toLocaleString()}
                      </span>
                      {c.resolved_at ? (
                        <span className="text-muted-foreground text-xs">
                          Resolved by {c.resolved_by_name ?? "someone"}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          loading={resolveComment.isPending}
                          onClick={() => resolveComment.mutate(c.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                    <p className={c.resolved_at ? "text-muted-foreground line-through" : undefined}>
                      {c.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {isOpen ? (
              <form
                className="mt-2 flex flex-col gap-2 border-t pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  addComment.mutate(
                    { blockIndex: i, anchorText: block.text, body: draft },
                    {
                      onSuccess: () => {
                        setDraft("");
                        setOpenBlockIndex(null);
                      },
                    },
                  );
                }}
              >
                <textarea
                  className="border-input bg-background w-full rounded-lg border p-2 text-sm"
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Leave a comment on this paragraph…"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={addComment.isPending}>
                    Comment
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setOpenBlockIndex(null);
                      setDraft("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {addComment.isError && (
                  <p role="alert" className="text-destructive text-xs">
                    {toAppError(addComment.error).message}
                  </p>
                )}
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setOpenBlockIndex(i)}
              >
                + Comment
              </Button>
            )}
          </div>
        );
      })}

      {unanchored.length > 0 && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground text-xs uppercase">Comments on removed content</p>
          <ul className="mt-2 flex flex-col gap-2">
            {unanchored.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="text-muted-foreground text-xs">
                  {c.author_name ?? "Someone"} on &ldquo;{c.anchor_text}&rdquo;
                </span>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
