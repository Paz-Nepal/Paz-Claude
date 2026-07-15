import { describe, expect, it } from "vitest";
import { isValidRange, formatKathmanduTime } from "./dates";

describe("isValidRange", () => {
  it("accepts an end time after the start time", () => {
    expect(isValidRange("2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z")).toBe(true);
  });

  it("rejects an end time equal to or before the start time", () => {
    expect(isValidRange("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z")).toBe(false);
    expect(isValidRange("2026-01-01T10:00:00Z", "2026-01-01T09:59:00Z")).toBe(false);
  });
});

describe("formatKathmanduTime", () => {
  it("labels the timezone explicitly so staff never assume server-local time", () => {
    expect(formatKathmanduTime("2026-01-01T00:00:00Z")).toContain("Asia/Kathmandu");
  });
});
