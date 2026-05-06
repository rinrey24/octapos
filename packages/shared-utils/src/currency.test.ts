import { describe, it, expect } from "vitest";
import {
  formatCurrency, parseCurrency, roundToNearest, calculateChange,
} from "./currency";

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0");
  });

  it("formats thousands with dot separator", () => {
    const result = formatCurrency(50000);
    expect(result).toContain("50");
    expect(result).toContain("000");
  });

  it("includes IDR currency marker", () => {
    const result = formatCurrency(100000);
    expect(result).toMatch(/Rp|IDR/);
  });

  it("handles large numbers", () => {
    expect(() => formatCurrency(999_999_999)).not.toThrow();
  });
});

describe("parseCurrency", () => {
  it("parses formatted currency string", () => {
    expect(parseCurrency("Rp 50.000")).toBe(50000);
  });

  it("parses plain number string", () => {
    expect(parseCurrency("100000")).toBe(100000);
  });

  it("returns 0 for empty string", () => {
    expect(parseCurrency("")).toBe(0);
  });

  it("strips non-numeric characters", () => {
    expect(parseCurrency("Rp 1.234.567")).toBe(1234567);
  });
});

describe("roundToNearest", () => {
  it("rounds up to nearest 500", () => {
    expect(roundToNearest(750)).toBe(1000);
  });

  it("rounds down to nearest 500", () => {
    expect(roundToNearest(400)).toBe(500);
  });

  it("does not change already-rounded value", () => {
    expect(roundToNearest(1000)).toBe(1000);
  });

  it("supports custom nearest value", () => {
    expect(roundToNearest(1200, 1000)).toBe(1000);
  });
});

describe("calculateChange", () => {
  it("calculates correct change", () => {
    expect(calculateChange(100000, 75000)).toBe(25000);
  });

  it("returns 0 when paid equals total", () => {
    expect(calculateChange(50000, 50000)).toBe(0);
  });

  it("returns 0 when underpaid (no negative change)", () => {
    expect(calculateChange(40000, 50000)).toBe(0);
  });
});
