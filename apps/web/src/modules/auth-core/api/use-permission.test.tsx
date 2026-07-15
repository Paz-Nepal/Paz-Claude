import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuthorization, type Authorization } from "./use-authorization";
import { usePermission } from "./use-permission";

vi.mock("./use-authorization", () => ({ useAuthorization: vi.fn() }));
const mockedUseAuthorization = vi.mocked(useAuthorization);

function authState(overrides: Partial<Authorization>): Authorization {
  return {
    signedIn: true,
    loading: false,
    aal: "aal2",
    permissions: [],
    permissionsLoading: false,
    ...overrides,
  };
}

describe("usePermission", () => {
  it("returns true when no permission key is given (sign-in-only gating)", () => {
    mockedUseAuthorization.mockReturnValue(authState({}));
    expect(renderHook(() => usePermission()).result.current).toBe(true);
  });

  it("returns true when the resolved permissions include the key", () => {
    mockedUseAuthorization.mockReturnValue(authState({ permissions: ["admin.settings.read"] }));
    expect(renderHook(() => usePermission("admin.settings.read")).result.current).toBe(true);
  });

  it("returns false when the resolved permissions lack the key", () => {
    mockedUseAuthorization.mockReturnValue(authState({}));
    expect(renderHook(() => usePermission("admin.settings.read")).result.current).toBe(false);
  });
});
