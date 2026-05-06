/** Format angka ke format Rupiah, mis. 50000 → "Rp 50.000" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse string mata uang kembali ke number, mis. "Rp 50.000" → 50000 */
export function parseCurrency(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}

/** Bulatkan ke kelipatan terdekat untuk kembalian */
export function roundToNearest(amount: number, nearest: number = 500): number {
  return Math.round(amount / nearest) * nearest;
}

/** Hitung kembalian */
export function calculateChange(paid: number, total: number): number {
  return Math.max(0, paid - total);
}
