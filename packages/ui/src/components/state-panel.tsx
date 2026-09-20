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
 *
 * role="status" already implies aria-live="polite" per the ARIA spec, but
 * an explicit aria-live is added anyway -- implicit role-to-live-region
 * mapping isn't universally honored by older screen reader/browser
 * combinations, and every form's success/error state in this codebase
 * already routes through this component or Field's own role="alert"
 * (packages/ui/src/components/field.tsx) either way, so this is belt
 * and suspenders on an already-covered path, not a new one.
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
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center",
        className,
      )}
      {...props}
    >
      <h2 className="text-foreground font-serif text-lg">{title}</h2>
      {description && <p className="text-muted-foreground max-w-reading text-sm">{description}</p>}
      {reference && (
        <p className="text-muted-foreground text-xs">
          Reference: <code className="font-mono">{reference}</code>
        </p>
      )}
      {action}
    </div>
  );
}
