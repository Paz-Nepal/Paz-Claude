import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { useAuthContext } from "@/lib/auth-context";
import { usePermission, useIsSignedIn, useHasVerifiedMfa } from "./use-permission";

vi.mock("@/lib/auth-context", () => ({ useAuthContext: vi.fn() }));
const mockedUseAuthContext = vi.mocked(useAuthContext);

describe("usePermission", () => {
  it("returns true when no permission key is given (sign-in-only routes)", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: null,
      loading: false,
      signOut: vi.fn(),
    });
    expect(renderHook(() => usePermission()).result.current).toBe(true);
  });

  it("returns true when the session's claims include the permission key", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: { permissions: ["admin.settings.read"] },
      loading: false,
      signOut: vi.fn(),
    });
    expect(renderHook(() => usePermission("admin.settings.read")).result.current).toBe(true);
  });

  it("returns false when the session's claims lack the permission key", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: { permissions: [] },
      loading: false,
      signOut: vi.fn(),
    });
    expect(renderHook(() => usePermission("admin.settings.read")).result.current).toBe(false);
  });
});

describe("useIsSignedIn", () => {
  it("is false while the session is still loading, even with a session present", () => {
    mockedUseAuthContext.mockReturnValue({
      session: {} as Session,
      claims: null,
      loading: true,
      signOut: vi.fn(),
    });
    expect(renderHook(() => useIsSignedIn()).result.current).toBe(false);
  });

  it("is true once loaded with a session", () => {
    mockedUseAuthContext.mockReturnValue({
      session: {} as Session,
      claims: null,
      loading: false,
      signOut: vi.fn(),
    });
    expect(renderHook(() => useIsSignedIn()).result.current).toBe(true);
  });
});

describe("useHasVerifiedMfa", () => {
  it("is false when the session's aal claim is aal1 or missing", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: { aal: "aal1" },
      loading: false,
      signOut: vi.fn(),
    });
    expect(renderHook(() => useHasVerifiedMfa()).result.current).toBe(false);
  });

  it("is true when the session's aal claim is aal2", () => {
    mockedUseAuthContext.mockReturnValue({
      session: null,
      claims: { aal: "aal2" },
      loading: false,
      signOut: vi.fn(),
    });
    expect(renderHook(() => useHasVerifiedMfa()).result.current).toBe(true);
  });
});
