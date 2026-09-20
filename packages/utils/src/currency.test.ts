import { describe, expect, it } from "vitest";
import { formatDimensions, formatMoney } from "./currency";

describe("formatMoney", () => {
  it("shows whole rupees without decimals", () => {
    expect(formatMoney(700000)).toContain("7,000");
    expect(formatMoney(700000)).not.toContain(".");
  });

  it("keeps paisa when there are any", () => {
    expect(formatMoney(700050)).toContain("7,000.50");
  });
});

describe("formatDimensions", () => {
  it("converts millimetres to centimetres, height first", () => {
    expect(formatDimensions(900, 1200)).toBe("90 × 120 cm");
  });

  it("includes depth when there is one", () => {
    expect(formatDimensions(900, 1200, 45)).toBe("90 × 120 × 4.5 cm");
  });

  it("returns null when nothing is known", () => {
    expect(formatDimensions(null, null)).toBeNull();
  });
});
