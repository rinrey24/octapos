import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";
import type { Stock, StockMovement, StockMovementType } from "@octapos/shared-types";

export interface StockWithProduct extends Stock {
  product_name: string;
  product_sku: string | null;
  category_name: string | null;
  track_stock: boolean;
}

export async function getStockList(outletId: string): Promise<StockWithProduct[]> {
  return dbSelect<StockWithProduct>(
    `SELECT s.*, p.name as product_name, p.sku as product_sku,
            p.track_stock, c.name as category_name
     FROM products p
     LEFT JOIN stock s ON s.product_id = p.id AND s.outlet_id = ?
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = 1 AND p.deleted_at IS NULL AND p.track_stock = 1
     ORDER BY c.sort_order ASC, p.name ASC`,
    [outletId]
  );
}

export async function getStockMovements(
  outletId: string,
  productId: string,
  limit = 30
): Promise<(StockMovement & { user_name: string })[]> {
  return dbSelect<StockMovement & { user_name: string }>(
    `SELECT sm.*, u.full_name as user_name
     FROM stock_movements sm
     JOIN users u ON sm.user_id = u.id
     WHERE sm.outlet_id = ? AND sm.product_id = ?
     ORDER BY sm.created_at DESC LIMIT ?`,
    [outletId, productId, limit]
  );
}

export async function getStockForProduct(
  outletId: string,
  productId: string
): Promise<Stock | null> {
  const rows = await dbSelect<Stock>(
    `SELECT * FROM stock WHERE outlet_id = ? AND product_id = ?`,
    [outletId, productId]
  );
  return rows[0] ?? null;
}

/** Upsert stok dan catat movement. */
async function applyStockChange(
  outletId: string,
  productId: string,
  type: StockMovementType,
  quantityDelta: number, // positive = tambah, negative = kurang
  userId: string,
  opts: { refType?: string; refId?: string; note?: string } = {}
): Promise<void> {
  const now = new Date().toISOString();
  const movementId = generateId();

  // Upsert stock (quantity can go negative to allow oversell detection)
  await dbExecute(
    `INSERT INTO stock (outlet_id, product_id, quantity, min_stock, updated_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(outlet_id, product_id) DO UPDATE SET
       quantity = quantity + ?,
       updated_at = excluded.updated_at`,
    [outletId, productId, quantityDelta, now, quantityDelta]
  );

  await dbExecute(
    `INSERT INTO stock_movements
       (id, outlet_id, product_id, type, quantity, ref_type, ref_id, note, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movementId, outletId, productId, type, Math.abs(quantityDelta),
      opts.refType ?? null, opts.refId ?? null, opts.note ?? null,
      userId, now,
    ]
  );
}

/** Stok masuk (terima barang). */
export async function stockIn(
  outletId: string,
  productId: string,
  quantity: number,
  userId: string,
  note?: string
): Promise<void> {
  await applyStockChange(outletId, productId, "in", quantity, userId, { ...(note !== undefined ? { note } : {}) });
}

/** Penyesuaian stok (set absolute quantity). */
export async function adjustStock(
  outletId: string,
  productId: string,
  newQuantity: number,
  userId: string,
  note?: string
): Promise<void> {
  const current = await getStockForProduct(outletId, productId);
  const currentQty = current?.quantity ?? 0;
  const delta = newQuantity - currentQty;
  await applyStockChange(outletId, productId, "adjustment", delta, userId, { ...(note !== undefined ? { note } : {}) });
}

/** Kurangi stok saat penjualan. */
export async function deductStockForSale(
  outletId: string,
  productId: string,
  quantity: number,
  userId: string,
  transactionId: string
): Promise<void> {
  await applyStockChange(outletId, productId, "sale", -quantity, userId, {
    refType: "transaction",
    refId: transactionId,
  });
}

/** Pulihkan stok saat void transaksi. */
export async function restoreStockForVoid(
  outletId: string,
  productId: string,
  quantity: number,
  userId: string,
  transactionId: string
): Promise<void> {
  await applyStockChange(outletId, productId, "void", quantity, userId, {
    refType: "transaction",
    refId: transactionId,
  });
}

export async function updateMinStock(
  outletId: string,
  productId: string,
  minStock: number
): Promise<void> {
  await dbExecute(
    `INSERT INTO stock (outlet_id, product_id, quantity, min_stock, updated_at) VALUES (?, ?, 0, ?, ?)
     ON CONFLICT(outlet_id, product_id) DO UPDATE SET min_stock = excluded.min_stock, updated_at = excluded.updated_at`,
    [outletId, productId, minStock, new Date().toISOString()]
  );
}
