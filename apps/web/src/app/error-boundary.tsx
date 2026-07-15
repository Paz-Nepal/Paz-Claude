import * as React from "react";
import { StatePanel, Button } from "@paz/ui";
import { toAppError } from "@paz/types";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  reference: string | null;
}

/**
 * React error boundaries must be class components (no hook equivalent as of
 * React 18). This is the single top-level boundary per layout (Frontend
 * Implementation Review §5.4); it renders the shared `StatePanel` so a
 * caught error and an empty-state look and feel the same institutional way.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null, reference: null };

  static getDerivedStateFromError(error: unknown): State {
    const appError = toAppError(error);
    return { error: appError, reference: appError.reference };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // TODO(T-0xx, Sentry integration): forward `error` + `info.componentStack`
    // with the same `reference` id so the incident can be looked up from the
    // reference a person reports.
    void info;
    if (import.meta.env.DEV) {
      console.error("[AppErrorBoundary]", error);
    }
  }

  private handleReset = () => {
    this.setState({ error: null, reference: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <StatePanel
            title="Something didn't work."
            description="Please try again. If this keeps happening, write to us and mention the reference below."
            reference={this.state.reference ?? undefined}
            action={
              <Button variant="secondary" onClick={this.handleReset}>
                Try again
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
