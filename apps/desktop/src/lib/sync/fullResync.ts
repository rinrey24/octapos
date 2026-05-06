import { dbSelect, dbExecute } from "@/lib/db";
import { enqueue } from "./queue";

/**
 * Re-enqueues all local SQLite data to the sync queue.
 * Use when the cloud DB is empty or out of sync with local data.
 * Clears existing pending/failed items first to avoid duplicates.
 */
export async function fullResync(tenantId: string, outletId: string): Promise<number> {
  // Clear existing pending + failed items to start fresh
  await dbExecute(
    `DELETE FROM sync_queue WHERE status IN ('pending', 'failed')`
  );

  let count = 0;

  // 1. Tenant
  const tenants = await dbSelect<Record<string, unknown>>(
    `SELECT id, name, business_type, created_at, updated_at FROM tenants WHERE id = ?`,
    [tenantId]
  );
  for (const row of tenants) {
    await enqueue("tenants", row["id"] as string, "insert", row);
    count++;
  }

  // 2. Outlets
  const outlets = await dbSelect<Record<string, unknown>>(
    `SELECT id, tenant_id, name, address, phone, timezone, receipt_header, receipt_footer
     FROM outlets WHERE tenant_id = ?`,
    [tenantId]
  );
  for (const row of outlets) {
    await enqueue("outlets", row["id"] as string, "insert", row);
    count++;
  }

  // 3. Users (without password_hash / pin_hash — don't sync secrets)
  const users = await dbSelect<Record<string, unknown>>(
    `SELECT id, tenant_id, email, full_name, role, is_active, last_login_at
     FROM users WHERE tenant_id = ? AND is_active = 1`,
    [tenantId]
  );
  for (const row of users) {
    await enqueue("users", row["id"] as string, "insert", row);
    count++;
  }

  // 4. Categories
  const categories = await dbSelect<Record<string, unknown>>(
    `SELECT id, tenant_id, name, color, sort_order, deleted_at
     FROM categories WHERE tenant_id = ?`,
    [tenantId]
  );
  for (const row of categories) {
    await enqueue("categories", row["id"] as string, "insert", row);
    count++;
  }

  // 5. Products
  const products = await dbSelect<Record<string, unknown>>(
    `SELECT id, tenant_id, sku, barcode, name, category_id, price, cost, tax_rate,
            image_url, is_active, track_stock, unit, deleted_at, created_at, updated_at, version
     FROM products WHERE tenant_id = ?`,
    [tenantId]
  );
  for (const row of products) {
    await enqueue("products", row["id"] as string, "insert", row);
    count++;
  }

  // 6. Customers
  const customers = await dbSelect<Record<string, unknown>>(
    `SELECT id, tenant_id, name, phone, email, total_spent, visit_count, last_visit_at
     FROM customers WHERE tenant_id = ?`,
    [tenantId]
  );
  for (const row of customers) {
    await enqueue("customers", row["id"] as string, "insert", row);
    count++;
  }

  // 7. Transactions
  const transactions = await dbSelect<Record<string, unknown>>(
    `SELECT id, tenant_id, outlet_id, invoice_no, cashier_id, customer_id,
            subtotal, discount_total, tax_total, service_charge, rounding, total,
            paid_amount, change_amount, status, payment_method, notes,
            voided_at, voided_by, void_reason, created_at, updated_at, device_id
     FROM transactions WHERE outlet_id = ?`,
    [outletId]
  );
  for (const row of transactions) {
    await enqueue("transactions", row["id"] as string, "insert", row);
    count++;
  }

  // 8. Transaction items
  const txIds = transactions.map((t) => t["id"] as string);
  if (txIds.length > 0) {
    const placeholders = txIds.map(() => "?").join(",");
    const items = await dbSelect<Record<string, unknown>>(
      `SELECT id, transaction_id, product_id, variant_id, product_name_snapshot,
              sku_snapshot, price_snapshot, quantity, discount, subtotal, notes
       FROM transaction_items WHERE transaction_id IN (${placeholders})`,
      txIds
    );
    for (const row of items) {
      await enqueue("transaction_items", row["id"] as string, "insert", row);
      count++;
    }

    const payments = await dbSelect<Record<string, unknown>>(
      `SELECT id, transaction_id, method, amount, reference_no, paid_at
       FROM transaction_payments WHERE transaction_id IN (${placeholders})`,
      txIds
    );
    for (const row of payments) {
      await enqueue("transaction_payments", row["id"] as string, "insert", row);
      count++;
    }
  }

  // 9. Stock movements
  const movements = await dbSelect<Record<string, unknown>>(
    `SELECT id, outlet_id, product_id, type, quantity, ref_type, ref_id, note, user_id, created_at
     FROM stock_movements WHERE outlet_id = ?`,
    [outletId]
  );
  for (const row of movements) {
    await enqueue("stock_movements", row["id"] as string, "insert", row);
    count++;
  }

  return count;
}
