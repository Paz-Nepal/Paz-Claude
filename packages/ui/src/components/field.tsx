import * as React from "react";
import { cn } from "@paz/utils";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
}

/**
 * Label + control + error/hint slot, wired for accessibility (label `for`,
 * `aria-describedby`/`aria-invalid` on whatever's passed as `children`
 * expected to read `id`/`aria-*` off the same `htmlFor` id).
 */
export function Field({ label, htmlFor, error, hint, className, children, ...props }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <label htmlFor={htmlFor} className="text-foreground text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
