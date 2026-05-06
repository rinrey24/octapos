import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";
import { enqueue } from "@/lib/sync/queue";
import { deductStockForSale, restoreStockForVoid } from "@/lib/repositories/inventory.repo";
import { recordCustomerPurchase } from "@/lib/repositories/customer.repo";
import type { Transaction, TransactionItem, CartItem } from "@octapos/shared-types";
import { calculateCartTotals } from "@octapos/shared-utils";

export interface TransactionWithItems extends Transaction {
  items: TransactionItem[];
  cashier_name: string;
}

export async function getTodaySequence(outletId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions
     WHERE outlet_id = ? AND DATE(created_at) = ?`,
    [outletId, today]
  );
  return (rows[0]?.count ?? 0) + 1;
}

function makeInvoiceNo(outletCode: string, sequence: number): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const seq = String(sequence).padStart(5, "0");
  return `${outletCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X")}-${ymd}-${seq}`;
}

export interface SplitPaymentEntry {
  method: Transaction["payment_method"];
  amount: number;
  referenceNo?: string | null;
}

export interface SaveTransactionInput {
  tenantId: string;
  outletId: string;
  outletCode: string;
  cashierId: string;
  customerId?: string | null;
  cartItems: CartItem[];
  paidAmount: number;
  paymentMethod: Transaction["payment_method"];
  splitPayments?: SplitPaymentEntry[];
  notes?: string | null;
  taxRate?: number;
  discountTotal?: number;
  deductStock?: boolean;
}

export async function saveTransaction(input: SaveTransactionInput): Promise<Transaction> {
  const {
    tenantId, outletId, outletCode, cashierId, customerId,
    cartItems, paidAmount, paymentMethod, splitPayments,
    notes, taxRate = 0, discountTotal = 0,
    deductStock = false,
  } = input;

  const subtotal = cartItems.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((s, m) => s + m.price_snapshot, 0);
    return sum + (item.price_snapshot + modTotal) * item.quantity - item.discount;
  }, 0);

  const totals = calculateCartTotals(subtotal, discountTotal, taxRate);
  const changeAmount = Math.max(0, paidAmount - totals.total);
  const now = new Date().toISOString();
  const seq = await getTodaySequence(outletId);
  const invoiceNo = makeInvoiceNo(outletCode, seq);
  const transactionId = generateId();
  const deviceId = "LOCAL";

  await dbExecute(
    `INSERT INTO transactions
       (id, tenant_id, outlet_id, invoice_no, cashier_id, customer_id, subtotal, discount_total,
        tax_total, service_charge, rounding, total, paid_amount, change_amount,
        status, payment_method, notes, created_at, updated_at, device_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'paid',?,?,?,?,?)`,
    [
      transactionId, tenantId, outletId, invoiceNo, cashierId, customerId ?? null,
      subtotal, totals.discount_total, totals.tax_total,
      totals.service_charge, totals.rounding, totals.total,
      paidAmount, changeAmount, paymentMethod, notes ?? null, now, now, deviceId,
    ]
  );

  for (const item of cartItems) {
    const itemId = generateId();
    await dbExecute(
      `INSERT INTO transaction_items
         (id, transaction_id, product_id, variant_id, product_name_snapshot,
          sku_snapshot, price_snapshot, quantity, discount, subtotal, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        itemId, transactionId, item.product_id, item.variant_id ?? null,
        item.product_name_snapshot, item.sku_snapshot ?? null,
        item.price_snapshot, item.quantity, item.discount,
        (item.price_snapshot * item.quantity) - item.discount,
        item.notes ?? null,
      ]
    );
  }

  // Payments — either split or single
  const payments: SplitPaymentEntry[] = splitPayments && splitPayments.length > 0
    ? splitPayments
    : [{ method: paymentMethod, amount: paidAmount }];

  for (const p of payments) {
    await dbExecute(
      `INSERT INTO transaction_payments (id, transaction_id, method, amount, reference_no, paid_at)
       VALUES (?,?,?,?,?,?)`,
      [generateId(), transactionId, p.method, p.amount, p.referenceNo ?? null, now]
    );
  }

  // Stock deduction
  if (deductStock) {
    for (const item of cartItems) {
      try {
        await deductStockForSale(outletId, item.product_id, item.quantity, cashierId, transactionId);
      } catch {
        // Non-fatal: product may not track stock
      }
    }
  }

  // Customer purchase recording
  if (customerId) {
    try {
      await recordCustomerPurchase(customerId, totals.total);
    } catch {
      // Non-fatal
    }
  }

  const transaction: Transaction = {
    id: transactionId, tenant_id: tenantId, outlet_id: outletId,
    invoice_no: invoiceNo, cashier_id: cashierId, customer_id: customerId ?? null,
    subtotal, discount_total: totals.discount_total, tax_total: totals.tax_total,
    service_charge: totals.service_charge, rounding: totals.rounding,
    total: totals.total, paid_amount: paidAmount, change_amount: changeAmount,
    status: "paid", payment_method: paymentMethod, notes: notes ?? null,
    voided_at: null, voided_by: null, void_reason: null,
    created_at: now, updated_at: now, synced_at: null, device_id: deviceId,
  };

  await enqueue("transactions", transactionId, "insert", transaction as unknown as Record<string, unknown>);
  return transaction;
}

export interface TransactionListRow {
  id: string;
  invoice_no: string;
  cashier_name: string;
  customer_name: string | null;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  item_count: number;
}

export async function getTransactions(outletId: string, limit = 50, cashierId?: string): Promise<TransactionListRow[]> {
  const whereCashier = cashierId ? " AND t.cashier_id = ?" : "";
  const params: (string | number)[] = cashierId
    ? [outletId, cashierId, limit]
    : [outletId, limit];
  return dbSelect<TransactionListRow>(
    `SELECT t.id, t.invoice_no, u.full_name as cashier_name, c.name as customer_name,
            t.total, t.payment_method, t.status, t.created_at,
            COUNT(ti.id) as item_count
     FROM transactions t
     JOIN users u ON t.cashier_id = u.id
     LEFT JOIN customers c ON t.customer_id = c.id
     LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
     WHERE t.outlet_id = ?${whereCashier}
     GROUP BY t.id
     ORDER BY t.created_at DESC
     LIMIT ?`,
    params
  );
}

export async function getTransactionDetail(id: string): Promise<TransactionWithItems | null> {
  const rows = await dbSelect<Transaction & { cashier_name: string }>(
    `SELECT t.*, u.full_name as cashier_name FROM transactions t
     JOIN users u ON t.cashier_id = u.id WHERE t.id = ?`,
    [id]
  );
  const tx = rows[0];
  if (!tx) return null;

  const items = await dbSelect<TransactionItem>(
    `SELECT * FROM transaction_items WHERE transaction_id = ?`,
    [id]
  );

  return { ...tx, items };
}

export async function voidTransaction(
  id: string,
  userId: string,
  reason: string,
  outletId?: string
): Promise<void> {
  const now = new Date().toISOString();
  await dbExecute(
    `UPDATE transactions SET status = 'void', voided_at = ?, voided_by = ?, void_reason = ?, updated_at = ?
     WHERE id = ?`,
    [now, userId, reason, now, id]
  );
  await enqueue("transactions", id, "update", { id, status: "void", voided_at: now, voided_by: userId, void_reason: reason });

  // Restore stock for voided items
  if (outletId) {
    const items = await dbSelect<TransactionItem>(
      `SELECT * FROM transaction_items WHERE transaction_id = ?`,
      [id]
    );
    for (const item of items) {
      try {
        await restoreStockForVoid(outletId, item.product_id, item.quantity, userId, id);
      } catch {
        // Non-fatal
      }
    }
  }
}
