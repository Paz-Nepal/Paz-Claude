import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@paz/utils";

/**
 * Converted from the legacy `apps/web/src/components/ui/Button.jsx`.
 *
 * Changes from the legacy version (documented per the "preserve useful
 * existing work" rule — this is a conversion, not a redesign):
 *  - Typed variants via cva instead of inline lookup objects.
 *  - `asChild` support (Radix Slot) so the button can render as a Link
 *    without losing styling — needed once routing is introduced.
 *  - Loading state now sets `aria-busy` and keeps the accessible name
 *    stable (legacy version swapped the label to "Loading...", which
 *    changes the button's accessible name mid-interaction).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium " +
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
    "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "bg-transparent hover:bg-muted text-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          // Radix Slot requires exactly one child element — no sibling
          // spinner, even a falsy one (`loading && …` is still a second
          // child node as far as Slot's React.Children.only check goes).
          children
        ) : (
          <>
            {loading && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
