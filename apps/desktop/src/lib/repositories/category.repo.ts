import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";
import { enqueue } from "@/lib/sync/queue";
import type { Category } from "@octapos/shared-types";

export async function getCategories(tenantId: string): Promise<Category[]> {
  return dbSelect<Category>(
    `SELECT * FROM categories WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, name ASC`,
    [tenantId]
  );
}

export async function createCategory(
  tenantId: string,
  data: { name: string; color?: string; sort_order?: number }
): Promise<Category> {
  const id = generateId();
  const row: Category = {
    id, tenant_id: tenantId, name: data.name,
    color: data.color ?? null, sort_order: data.sort_order ?? 0, deleted_at: null,
  };
  await dbExecute(
    `INSERT INTO categories (id, tenant_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
    [id, tenantId, data.name, data.color ?? null, data.sort_order ?? 0]
  );
  await enqueue("categories", id, "insert", row as unknown as Record<string, unknown>);
  return row;
}

export async function updateCategory(
  id: string,
  data: { name?: string; color?: string; sort_order?: number }
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
  if (data.color !== undefined) { fields.push("color = ?"); params.push(data.color); }
  if (data.sort_order !== undefined) { fields.push("sort_order = ?"); params.push(data.sort_order); }
  if (fields.length === 0) return;
  params.push(id);
  await dbExecute(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`, params);
  await enqueue("categories", id, "update", data as Record<string, unknown>);
}

export async function deleteCategory(id: string): Promise<void> {
  const now = new Date().toISOString();
  await dbExecute(`UPDATE categories SET deleted_at = ? WHERE id = ?`, [now, id]);
  await enqueue("categories", id, "delete", { id, deleted_at: now });
}
