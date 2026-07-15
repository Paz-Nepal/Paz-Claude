import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { AppErrorBoundary } from "./error-boundary";

/**
 * Composition root. Kept intentionally small — no global UI state library
 * (Frontend Implementation Review §5.2: server state is TanStack Query,
 * everything else is component state or context; if a genuine cross-cutting
 * client-state need appears later, Zustand is the pre-approved choice,
 * ADR-33 — not introduced now because nothing requires it yet).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>{children}</AppErrorBoundary>
    </QueryClientProvider>
  );
}
