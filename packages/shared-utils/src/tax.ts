/** Hitung pajak dari subtotal */
export function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * (taxRate / 100));
}

/** Hitung total diskon per transaksi (percentage atau fixed) */
export function calculateDiscount(
  subtotal: number,
  discountType: "percentage" | "fixed",
  discountValue: number
): number {
  if (discountType === "percentage") {
    return Math.round(subtotal * (discountValue / 100));
  }
  return Math.min(discountValue, subtotal);
}

export interface CartTotals {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_charge: number;
  rounding: number;
  total: number;
}

export function calculateCartTotals(
  subtotal: number,
  discountTotal: number,
  taxRate: number,
  serviceChargeRate: number = 0
): CartTotals {
  const afterDiscount = subtotal - discountTotal;
  const tax_total = calculateTax(afterDiscount, taxRate);
  const service_charge = Math.round(afterDiscount * (serviceChargeRate / 100));
  const beforeRounding = afterDiscount + tax_total + service_charge;
  const rounding = roundingAmount(beforeRounding);
  const total = beforeRounding + rounding;

  return {
    subtotal,
    discount_total: discountTotal,
    tax_total,
    service_charge,
    rounding,
    total,
  };
}

/** Hitung rounding ke Rp 100 terdekat */
function roundingAmount(amount: number): number {
  const rounded = Math.round(amount / 100) * 100;
  return rounded - amount;
}
