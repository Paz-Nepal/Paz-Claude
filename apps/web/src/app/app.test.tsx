import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./app";

// The app shell renders behind the Supabase client, which throws if env vars
// are missing (see lib/supabase.ts), and AuthProvider calls into
// `supabase.auth` on mount (see lib/auth-context.tsx). Mock both so this is
// a pure UI-shell smoke test, independent of any running Supabase instance.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

describe("App shell", () => {
  it("renders the home route without crashing", async () => {
    render(<App />);
    expect(await screen.findByText(/PAZ OS — foundation running/i)).toBeInTheDocument();
  });
});
