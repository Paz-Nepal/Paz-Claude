import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuthorization, type Authorization } from "../api/use-authorization";
import { ProtectedRoute } from "./protected-route";

vi.mock("../api/use-authorization", () => ({ useAuthorization: vi.fn() }));
const mockedUseAuthorization = vi.mocked(useAuthorization);

function authState(overrides: Partial<Authorization>): Authorization {
  return {
    signedIn: false,
    loading: false,
    aal: "aal1",
    permissions: [],
    permissionsLoading: false,
    ...overrides,
  };
}

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
    mockedUseAuthorization.mockReturnValue(authState({ loading: true }));
    renderProtected();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows a loading state while permissions are still being fetched", () => {
    mockedUseAuthorization.mockReturnValue(
      authState({ signedIn: true, aal: "aal2", permissionsLoading: true }),
    );
    renderProtected();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects to sign-in when there is no session", () => {
    mockedUseAuthorization.mockReturnValue(authState({}));
    renderProtected();
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
  });

  it("redirects to MFA enrollment when signed in without a verified aal2 session", () => {
    mockedUseAuthorization.mockReturnValue(
      authState({ signedIn: true, aal: "aal1", permissions: ["admin.settings.read"] }),
    );
    renderProtected();
    expect(screen.getByText("MFA enroll page")).toBeInTheDocument();
  });

  it("shows a no-access panel when MFA-verified but missing the required permission", () => {
    mockedUseAuthorization.mockReturnValue(authState({ signedIn: true, aal: "aal2" }));
    renderProtected();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it("renders the protected content when signed in, MFA-verified, and permitted", () => {
    mockedUseAuthorization.mockReturnValue(
      authState({ signedIn: true, aal: "aal2", permissions: ["admin.settings.read"] }),
    );
    renderProtected();
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
