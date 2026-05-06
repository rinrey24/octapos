/**
 * Generate invoice number unik dengan format: OUTLETCODE-YYYYMMDD-XXXXX
 * Contoh: "CBGA-20260503-00123"
 */
export function generateInvoiceNo(
  outletCode: string,
  sequence: number,
  date: Date = new Date()
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(5, "0");
  return `${outletCode.toUpperCase()}-${year}${month}${day}-${seq}`;
}

/** Derive kode outlet singkat (max 4 karakter) dari nama outlet */
export function deriveOutletCode(outletName: string): string {
  return outletName
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
}
