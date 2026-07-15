import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./app";

/**
 * Minimal thenable query-builder stand-in: every chain method returns
 * itself, and the object resolves like a promise (`.then`) so both
 * `await query` and `await query.maybeSingle()` work — mirrors how
 * @supabase/postgrest-js builders behave.
 */
function queryBuilder(data: unknown) {
  const result = { data, error: null };
  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    eq: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

// The app shell renders behind the Supabase client, which throws if env vars
// are missing (see lib/supabase.ts); AuthProvider reads `supabase.auth` on
// mount (lib/auth-context.tsx); the public homepage reads site info and
// published items through `supabase.schema("api")` (modules/site). Mock all
// three so this is a pure UI-shell smoke test, independent of any running
// Supabase instance.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    schema: () => ({
      from: () => queryBuilder([]),
      rpc: (name: string) => queryBuilder(name === "site_info" ? {} : []),
    }),
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }),
    },
  },
}));

describe("App shell", () => {
  it("renders the public homepage without crashing", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "PAZ" })).toBeInTheDocument();
    expect(screen.getByText("From the journal")).toBeInTheDocument();
  });
});
