import { describe, expect, it } from "vitest";
import { isValidRange, formatKathmanduTime, kathmanduInputToUtcIso } from "./dates";

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

describe("kathmanduInputToUtcIso", () => {
  it("subtracts the fixed UTC+05:45 offset", () => {
    // 2026-01-01 05:45 in Kathmandu is 2026-01-01 00:00 UTC.
    expect(kathmanduInputToUtcIso("2026-01-01T05:45")).toBe("2026-01-01T00:00:00.000Z");
  });

  it("round-trips through formatKathmanduTime's own displayed values", () => {
    // Midnight UTC is 05:45 Kathmandu the same day -- the two helpers
    // should agree on which calendar day that is.
    const utcIso = kathmanduInputToUtcIso("2026-06-15T00:15");
    expect(formatKathmanduTime(utcIso)).toContain("Jun 15, 2026");
  });
});
