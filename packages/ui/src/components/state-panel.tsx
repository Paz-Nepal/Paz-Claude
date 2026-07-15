import * as React from "react";
import { cn } from "@paz/utils";

export interface StatePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Shown for error states only — quoted so a person can reference it when writing in. */
  reference?: string | undefined;
  action?: React.ReactNode;
}

/**
 * Shared shell for "nothing here yet" and "something went wrong" surfaces.
 * Deliberately plain: per the institutional design philosophy (Architecture
 * Blueprint §1, Design Philosophy) an error page should feel calm and
 * respectful, never alarming — no red flashes, no stack traces, no jargon.
 */
export function StatePanel({
  title,
  description,
  reference,
  action,
  className,
  ...props
}: StatePanelProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center",
        className,
      )}
      {...props}
    >
      <h2 className="text-foreground font-serif text-lg">{title}</h2>
      {description && <p className="text-muted-foreground max-w-prose text-sm">{description}</p>}
      {reference && (
        <p className="text-muted-foreground text-xs">
          Reference: <code className="font-mono">{reference}</code>
        </p>
      )}
      {action}
    </div>
  );
}
