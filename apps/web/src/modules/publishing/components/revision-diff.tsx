import type { RichTextNode } from "@paz/ui";
import { diffBlocks, flattenBlocks } from "../lib/revision-diff";

const BLOCK_LABELS: Record<string, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  blockquote: "Quote",
  bulletListItem: "List item",
  orderedListItem: "List item",
  horizontalRule: "Divider",
};

function labelFor(type: string): string {
  return BLOCK_LABELS[type] ?? type;
}

export interface RevisionDiffProps {
  title: string;
  prevTitle: string | undefined;
  body: RichTextNode | null | undefined;
  prevBody: RichTextNode | null | undefined;
}

/**
 * Shows what changed to produce this revision, relative to the one before
 * it. `prevBody`/`prevTitle` undefined means there is no earlier revision
 * (this is the first one on record), so everything renders as added.
 */
export function RevisionDiff({ title, prevTitle, body, prevBody }: RevisionDiffProps) {
  const ops = diffBlocks(flattenBlocks(prevBody), flattenBlocks(body));
  const titleChanged = prevTitle !== undefined && prevTitle !== title;

  return (
    <div className="flex flex-col gap-2 text-sm">
      {titleChanged && (
        <p>
          <span className="text-muted-foreground">Title: </span>
          <span className="bg-destructive/10 text-destructive line-through">{prevTitle}</span>
          {" → "}
          <span className="bg-brand/10 text-brand">{title}</span>
        </p>
      )}
      {ops.length === 0 && !titleChanged && (
        <p className="text-muted-foreground italic">No change from the previous revision.</p>
      )}
      {ops.map((op, i) => {
        if (op.block.text.trim() === "" && op.block.type !== "horizontalRule") return null;
        const label = labelFor(op.block.type);
        if (op.op === "equal") {
          return (
            <p key={i} className="text-muted-foreground">
              <span className="text-xs uppercase">{label}</span> · {op.block.text}
            </p>
          );
        }
        if (op.op === "remove") {
          return (
            <p key={i} className="bg-destructive/10 text-destructive rounded px-2 py-1">
              <span className="text-xs uppercase">− {label}</span>
              {" · "}
              <span className="line-through">{op.block.text}</span>
            </p>
          );
        }
        return (
          <p key={i} className="bg-brand/10 text-brand rounded px-2 py-1">
            <span className="text-xs uppercase">+ {label}</span> · {op.block.text}
          </p>
        );
      })}
    </div>
  );
}
