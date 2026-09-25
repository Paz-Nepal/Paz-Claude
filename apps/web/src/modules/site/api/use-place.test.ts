import { describe, expect, it, vi } from "vitest";

// use-place.ts reads through the Supabase client; only the pure helper is exercised here.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/edge-functions", () => ({ invokeEdgeFunction: vi.fn() }));
import { settingNumber } from "./use-place";

describe("settingNumber", () => {
  it("reads a number stored as a number or as text", () => {
    expect(settingNumber(700000)).toBe(700000);
    expect(settingNumber("700000")).toBe(700000);
    expect(settingNumber(" 30 ")).toBe(30);
  });

  it("treats blank, missing and nonsense as not set, so nothing is invented", () => {
    expect(settingNumber(null)).toBeNull();
    expect(settingNumber(undefined)).toBeNull();
    expect(settingNumber("")).toBeNull();
    expect(settingNumber("soon")).toBeNull();
  });
});
