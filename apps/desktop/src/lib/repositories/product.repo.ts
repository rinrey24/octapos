import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";
import { enqueue } from "@/lib/sync/queue";
import type { Product, ProductWithCategory } from "@octapos/shared-types";

export interface ProductRow {
  id: string;
  tenant_id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  price: number;
  cost: number | null;
  tax_rate: number;
  image_url: string | null;
  is_active: number;
  track_stock: number;
  unit: string;
  deleted_at: string | null;
  version: number;
}

export async function getProducts(tenantId: string): Promise<ProductWithCategory[]> {
  const rows = await dbSelect<ProductRow>(
    `SELECT p.*, c.name as category_name, c.color as category_color
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.tenant_id = ? AND p.deleted_at IS NULL AND p.is_active = 1
     ORDER BY c.sort_order ASC, p.name ASC`,
    [tenantId]
  );

  return rows.map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    sku: r.sku,
    barcode: r.barcode,
    name: r.name,
    category_id: r.category_id,
    price: r.price,
    cost: r.cost,
    tax_rate: r.tax_rate,
    image_url: r.image_url,
    is_active: Boolean(r.is_active),
    track_stock: Boolean(r.track_stock),
    unit: r.unit,
    deleted_at: r.deleted_at,
    version: r.version,
    category: r.category_id
      ? { id: r.category_id, tenant_id: r.tenant_id, name: r.category_name ?? "", color: r.category_color, sort_order: 0, deleted_at: null }
      : null,
    variants: [],
    modifiers: [],
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const rows = await dbSelect<Product>(
    `SELECT * FROM products WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getProductByBarcode(
  tenantId: string,
  barcode: string
): Promise<Product | null> {
  const rows = await dbSelect<Product>(
    `SELECT * FROM products WHERE tenant_id = ? AND barcode = ? AND deleted_at IS NULL AND is_active = 1`,
    [tenantId, barcode]
  );
  return rows[0] ?? null;
}

export interface CreateProductData {
  name: string;
  category_id?: string | null;
  price: number;
  cost?: number | null;
  tax_rate?: number;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  track_stock?: boolean;
  image_url?: string | null;
}

export async function createProduct(
  tenantId: string,
  data: CreateProductData
): Promise<Product> {
  const id = generateId();
  const now = new Date().toISOString();

  await dbExecute(
    `INSERT INTO products
       (id, tenant_id, sku, barcode, name, category_id, price, cost, tax_rate,
        image_url, is_active, track_stock, unit, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      id, tenantId, data.sku ?? null, data.barcode ?? null, data.name,
      data.category_id ?? null, data.price, data.cost ?? null,
      data.tax_rate ?? 0, data.image_url ?? null,
      data.track_stock !== false ? 1 : 0,
      data.unit ?? "pcs", now, now,
    ]
  );

  const product: Product = {
    id, tenant_id: tenantId, sku: data.sku ?? null, barcode: data.barcode ?? null,
    name: data.name, category_id: data.category_id ?? null, price: data.price,
    cost: data.cost ?? null, tax_rate: data.tax_rate ?? 0,
    image_url: data.image_url ?? null, is_active: true,
    track_stock: data.track_stock !== false, unit: data.unit ?? "pcs",
    deleted_at: null, version: 1,
  };
  await enqueue("products", id, "insert", product as unknown as Record<string, unknown>);
  return product;
}

export async function updateProduct(id: string, data: Partial<CreateProductData>): Promise<void> {
  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?", "version = version + 1"];
  const params: unknown[] = [now];

  const map: Record<string, unknown> = {
    name: data.name, category_id: data.category_id, price: data.price,
    cost: data.cost, tax_rate: data.tax_rate, sku: data.sku,
    barcode: data.barcode, unit: data.unit,
    track_stock: data.track_stock !== undefined ? (data.track_stock ? 1 : 0) : undefined,
    image_url: data.image_url,
  };

  for (const [key, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      params.push(val);
    }
  }

  params.push(id);
  await dbExecute(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, params);
  await enqueue("products", id, "update", { id, updated_at: now, ...data });
}

export async function deleteProduct(id: string): Promise<void> {
  const now = new Date().toISOString();
  await dbExecute(`UPDATE products SET deleted_at = ? WHERE id = ?`, [now, id]);
  await enqueue("products", id, "delete", { id, deleted_at: now });
}
