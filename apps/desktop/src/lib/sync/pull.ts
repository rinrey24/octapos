import { getSupabaseClient } from "./config";
import { dbSelect, dbExecute } from "@/lib/db";

// Tables that have tenant_id and can be queried directly
const TENANT_TABLES = ["categories", "products", "transactions"] as const;
// Tables pulled indirectly (no tenant_id column)
const TABLES = [...TENANT_TABLES, "transaction_items"] as const;
type SyncTable = (typeof TABLES)[number];

async function getLastPulledAt(): Promise<string | null> {
  const rows = await dbSelect<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'last_pulled_at'`
  );
  return rows[0]?.value ?? null;
}

async function setLastPulledAt(iso: string): Promise<void> {
  await dbExecute(
    `INSERT INTO app_settings (key, value) VALUES ('last_pulled_at', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [iso]
  );
}

type RemoteRow = Record<string, unknown>;

async function upsertRows(table: SyncTable, rows: RemoteRow[]): Promise<void> {
  for (const row of rows) {
    if (table === "categories") {
      await dbExecute(
        `INSERT INTO categories (id, tenant_id, name, color, sort_order, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, color = excluded.color,
           sort_order = excluded.sort_order, deleted_at = excluded.deleted_at`,
        [row["id"], row["tenant_id"], row["name"], row["color"] ?? null, row["sort_order"] ?? 0, row["deleted_at"] ?? null]
      );
    } else if (table === "products") {
      await dbExecute(
        `INSERT INTO products
           (id, tenant_id, sku, barcode, name, category_id, price, cost, tax_rate,
            image_url, is_active, track_stock, unit, deleted_at, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, category_id = excluded.category_id,
           price = excluded.price, cost = excluded.cost, tax_rate = excluded.tax_rate,
           image_url = excluded.image_url, is_active = excluded.is_active,
           track_stock = excluded.track_stock, unit = excluded.unit,
           deleted_at = excluded.deleted_at, version = excluded.version,
           updated_at = excluded.updated_at
         WHERE excluded.version > products.version`,
        [
          row["id"], row["tenant_id"], row["sku"] ?? null, row["barcode"] ?? null,
          row["name"], row["category_id"] ?? null, row["price"], row["cost"] ?? null,
          row["tax_rate"] ?? 0, row["image_url"] ?? null,
          row["is_active"] ? 1 : 0, row["track_stock"] ? 1 : 0,
          row["unit"] ?? "pcs", row["deleted_at"] ?? null,
          row["version"] ?? 1, row["updated_at"],
        ]
      );
    } else if (table === "transactions") {
      // Transactions are append-only; only sync if not already present
      await dbExecute(
        `INSERT OR IGNORE INTO transactions
           (id, tenant_id, outlet_id, invoice_no, cashier_id, subtotal, discount_total,
            tax_total, service_charge, rounding, total, paid_amount, change_amount,
            status, payment_method, notes, voided_at, voided_by, void_reason,
            created_at, updated_at, device_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          row["id"], row["tenant_id"], row["outlet_id"], row["invoice_no"],
          row["cashier_id"], row["subtotal"], row["discount_total"], row["tax_total"],
          row["service_charge"], row["rounding"], row["total"], row["paid_amount"],
          row["change_amount"], row["status"], row["payment_method"], row["notes"] ?? null,
          row["voided_at"] ?? null, row["voided_by"] ?? null, row["void_reason"] ?? null,
          row["created_at"], row["updated_at"], row["device_id"] ?? "REMOTE",
        ]
      );
    } else if (table === "transaction_items") {
      await dbExecute(
        `INSERT OR IGNORE INTO transaction_items
           (id, transaction_id, product_id, variant_id, product_name_snapshot,
            sku_snapshot, price_snapshot, quantity, discount, subtotal, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          row["id"], row["transaction_id"], row["product_id"], row["variant_id"] ?? null,
          row["product_name_snapshot"], row["sku_snapshot"] ?? null, row["price_snapshot"],
          row["quantity"], row["discount"] ?? 0, row["subtotal"], row["notes"] ?? null,
        ]
      );
    }
  }
}

export async function pullRemoteChanges(tenantId: string): Promise<{ pulled: number }> {
  const client = await getSupabaseClient();
  if (!client) return { pulled: 0 };

  const since = await getLastPulledAt();
  const pullAt = new Date().toISOString();
  let pulled = 0;

  // Pull tenant-scoped tables
  for (const table of TENANT_TABLES) {
    let query = client
      .from(table)
      .select("*")
      .eq("tenant_id", tenantId);

    if (since) {
      query = query.gt("updated_at", since);
    }

    const { data, error } = await query.limit(500);
    if (error || !data) continue;

    await upsertRows(table as SyncTable, data as RemoteRow[]);
    pulled += data.length;
  }

  // Pull transaction_items via transaction_id join (Supabase foreign table query)
  {
    let query = client
      .from("transaction_items")
      .select("*, transactions!inner(tenant_id)")
      .eq("transactions.tenant_id", tenantId);

    if (since) {
      query = query.gt("updated_at", since);
    }

    const { data, error } = await query.limit(500);
    if (!error && data) {
      await upsertRows("transaction_items", data as RemoteRow[]);
      pulled += data.length;
    }
  }

  await setLastPulledAt(pullAt);
  return { pulled };
}
