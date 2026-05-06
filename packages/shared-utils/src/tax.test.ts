import { describe, it, expect } from "vitest";
import { calculateTax, calculateDiscount, calculateCartTotals } from "./tax";

describe("calculateTax", () => {
  it("calculates 10% tax correctly", () => {
    expect(calculateTax(100000, 10)).toBe(10000);
  });

  it("returns 0 for 0% tax rate", () => {
    expect(calculateTax(100000, 0)).toBe(0);
  });

  it("rounds fractional tax to integer", () => {
    const tax = calculateTax(10001, 10);
    expect(Number.isInteger(tax)).toBe(true);
  });
});

describe("calculateDiscount", () => {
  it("calculates percentage discount", () => {
    expect(calculateDiscount(100000, "percentage", 10)).toBe(10000);
  });

  it("calculates fixed discount", () => {
    expect(calculateDiscount(100000, "fixed", 15000)).toBe(15000);
  });

  it("caps fixed discount at subtotal", () => {
    expect(calculateDiscount(50000, "fixed", 100000)).toBe(50000);
  });

  it("caps percentage discount at 100%", () => {
    expect(calculateDiscount(50000, "percentage", 100)).toBe(50000);
  });
});

describe("calculateCartTotals", () => {
  it("calculates totals with no tax and no discount", () => {
    const result = calculateCartTotals(100000, 0, 0);
    expect(result.subtotal).toBe(100000);
    expect(result.discount_total).toBe(0);
    expect(result.tax_total).toBe(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("applies discount before tax", () => {
    const result = calculateCartTotals(100000, 10000, 10);
    // After 10k discount → 90k base → 9k tax
    expect(result.tax_total).toBe(9000);
    expect(result.discount_total).toBe(10000);
  });

  it("total >= subtotal - discount (rounding can add/subtract)", () => {
    const result = calculateCartTotals(75000, 5000, 11);
    const base = 75000 - 5000;
    expect(result.total).toBeGreaterThanOrEqual(base - 100);
  });

  it("total is a non-negative integer", () => {
    const result = calculateCartTotals(50000, 0, 0);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.total)).toBe(true);
  });

  it("handles service charge", () => {
    const result = calculateCartTotals(100000, 0, 0, 5);
    expect(result.service_charge).toBe(5000);
  });
});
