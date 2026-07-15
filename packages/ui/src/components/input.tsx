import * as React from "react";
import { cn } from "@paz/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "border-input bg-background text-foreground placeholder:text-muted-foreground flex h-10 w-full rounded-lg border px-3 py-2 text-base transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
