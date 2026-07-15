import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { useAuthContext } from "@/lib/auth-context";
import { ProtectedRoute } from "./protected-route";

vi.mock("@/lib/auth-context", () => ({ useAuthContext: vi.fn() }));
const mockedUseAuthContext = vi.mocked(useAuthContext);

// Uses the plain `<Routes>` component (not `createMemoryRouter`'s data
// router) deliberately: the data router issues real `Request`/`AbortSignal`
// objects through its fetcher machinery even for pure client-side
// navigation, which trips a jsdom/undici realm mismatch under Vitest. The
// app's real router.tsx uses `createBrowserRouter`, but `<Navigate>`'s
// redirect behavior — what's under test here — works identically under both.
function renderProtected(initialPath = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/sign-in" element={<div>Sign in page</div>} />
        <Route path="/admin/mfa-enroll" element={<div>MFA enroll page</div>} />
        <Route
          path="/admin"
          element={<ProtectedRoute requireMfa permission="admin.settings.read" />}
        >
          <Route index element={<div>Admin content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading state while the session is still resolving", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: null,
      loading: true,
      signOut: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects to sign-in when there is no session", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: null,
      loading: false,
      signOut: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
  });

  it("redirects to MFA enrollment when signed in without a verified aal2 session", () => {
    mockedUseAuthContext.mockReturnValue({
      session: {} as Session,
      claims: { aal: "aal1", permissions: ["admin.settings.read"] },
      loading: false,
      signOut: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText("MFA enroll page")).toBeInTheDocument();
  });

  it("shows a no-access panel when MFA-verified but missing the required permission", () => {
    mockedUseAuthContext.mockReturnValue({
      session: {} as Session,
      claims: { aal: "aal2", permissions: [] },
      loading: false,
      signOut: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it("renders the protected content when signed in, MFA-verified, and permitted", () => {
    mockedUseAuthContext.mockReturnValue({
      session: {} as Session,
      claims: { aal: "aal2", permissions: ["admin.settings.read"] },
      loading: false,
      signOut: vi.fn(),
    });
    renderProtected();
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
