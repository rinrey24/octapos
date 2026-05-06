import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";
import type { Modifier, ModifierOption } from "@octapos/shared-types";

export interface ModifierWithOptions extends Modifier {
  options: ModifierOption[];
}

export async function getModifiers(tenantId: string): Promise<ModifierWithOptions[]> {
  const mods = await dbSelect<Modifier>(
    `SELECT * FROM modifiers WHERE tenant_id = ? ORDER BY name ASC`,
    [tenantId]
  );
  if (mods.length === 0) return [];

  const modIds = mods.map((m) => m.id);
  const placeholders = modIds.map(() => "?").join(",");
  const options = await dbSelect<ModifierOption>(
    `SELECT * FROM modifier_options WHERE modifier_id IN (${placeholders}) ORDER BY name ASC`,
    modIds
  );

  return mods.map((m) => ({
    ...m,
    options: options.filter((o) => o.modifier_id === m.id),
  }));
}

export async function getProductModifiers(productId: string): Promise<ModifierWithOptions[]> {
  const mods = await dbSelect<Modifier>(
    `SELECT m.* FROM product_modifiers pm
     JOIN modifiers m ON pm.modifier_id = m.id
     WHERE pm.product_id = ?
     ORDER BY m.name ASC`,
    [productId]
  );
  if (mods.length === 0) return [];

  const modIds = mods.map((m) => m.id);
  const placeholders = modIds.map(() => "?").join(",");
  const options = await dbSelect<ModifierOption>(
    `SELECT * FROM modifier_options WHERE modifier_id IN (${placeholders}) ORDER BY name ASC`,
    modIds
  );

  return mods.map((m) => ({
    ...m,
    options: options.filter((o) => o.modifier_id === m.id),
  }));
}

export async function createModifier(
  tenantId: string,
  name: string,
  type: "single" | "multiple"
): Promise<Modifier> {
  const id = generateId();
  await dbExecute(
    `INSERT INTO modifiers (id, tenant_id, name, type) VALUES (?, ?, ?, ?)`,
    [id, tenantId, name, type]
  );
  return { id, tenant_id: tenantId, name, type };
}

export async function updateModifier(
  id: string,
  data: { name?: string; type?: "single" | "multiple" }
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
  if (data.type !== undefined) { fields.push("type = ?"); params.push(data.type); }
  if (fields.length === 0) return;
  params.push(id);
  await dbExecute(`UPDATE modifiers SET ${fields.join(", ")} WHERE id = ?`, params);
}

export async function deleteModifier(id: string): Promise<void> {
  await dbExecute(`DELETE FROM modifier_options WHERE modifier_id = ?`, [id]);
  await dbExecute(`DELETE FROM product_modifiers WHERE modifier_id = ?`, [id]);
  await dbExecute(`DELETE FROM modifiers WHERE id = ?`, [id]);
}

export async function createModifierOption(
  modifierId: string,
  name: string,
  priceDelta: number
): Promise<ModifierOption> {
  const id = generateId();
  await dbExecute(
    `INSERT INTO modifier_options (id, modifier_id, name, price_delta) VALUES (?, ?, ?, ?)`,
    [id, modifierId, name, priceDelta]
  );
  return { id, modifier_id: modifierId, name, price_delta: priceDelta };
}

export async function deleteModifierOption(id: string): Promise<void> {
  await dbExecute(`DELETE FROM modifier_options WHERE id = ?`, [id]);
}

export async function linkModifierToProduct(
  productId: string,
  modifierId: string
): Promise<void> {
  await dbExecute(
    `INSERT OR IGNORE INTO product_modifiers (product_id, modifier_id) VALUES (?, ?)`,
    [productId, modifierId]
  );
}

export async function unlinkModifierFromProduct(
  productId: string,
  modifierId: string
): Promise<void> {
  await dbExecute(
    `DELETE FROM product_modifiers WHERE product_id = ? AND modifier_id = ?`,
    [productId, modifierId]
  );
}
