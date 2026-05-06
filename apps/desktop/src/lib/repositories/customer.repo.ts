import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";
import { enqueue } from "@/lib/sync/queue";

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  total_spent: number;
  visit_count: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getCustomers(tenantId: string): Promise<Customer[]> {
  return dbSelect<Customer>(
    `SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
    [tenantId]
  );
}

export async function searchCustomers(
  tenantId: string,
  query: string
): Promise<Customer[]> {
  const q = `%${query}%`;
  return dbSelect<Customer>(
    `SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL
     AND (name LIKE ? OR phone LIKE ?)
     ORDER BY name ASC LIMIT 20`,
    [tenantId, q, q]
  );
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const rows = await dbSelect<Customer>(
    `SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createCustomer(
  tenantId: string,
  data: { name: string; phone?: string | null; email?: string | null; notes?: string | null }
): Promise<Customer> {
  const id = generateId();
  const now = new Date().toISOString();

  await dbExecute(
    `INSERT INTO customers (id, tenant_id, name, phone, email, notes, total_spent, visit_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [id, tenantId, data.name, data.phone ?? null, data.email ?? null, data.notes ?? null, now, now]
  );

  const customer: Customer = {
    id, tenant_id: tenantId, name: data.name, phone: data.phone ?? null,
    email: data.email ?? null, notes: data.notes ?? null,
    total_spent: 0, visit_count: 0, last_visit_at: null,
    created_at: now, updated_at: now, deleted_at: null,
  };
  await enqueue("customers", id, "insert", customer as unknown as Record<string, unknown>);
  return customer;
}

export async function updateCustomer(
  id: string,
  data: { name?: string; phone?: string | null; email?: string | null; notes?: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];

  if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
  if (data.phone !== undefined) { fields.push("phone = ?"); params.push(data.phone); }
  if (data.email !== undefined) { fields.push("email = ?"); params.push(data.email); }
  if (data.notes !== undefined) { fields.push("notes = ?"); params.push(data.notes); }

  params.push(id);
  await dbExecute(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`, params);
  await enqueue("customers", id, "update", { id, updated_at: now, ...data });
}

export async function deleteCustomer(id: string): Promise<void> {
  const now = new Date().toISOString();
  await dbExecute(`UPDATE customers SET deleted_at = ? WHERE id = ?`, [now, id]);
  await enqueue("customers", id, "delete", { id, deleted_at: now });
}

/** Perbarui total_spent dan visit_count setelah transaksi. */
export async function recordCustomerPurchase(
  customerId: string,
  amount: number
): Promise<void> {
  const now = new Date().toISOString();
  await dbExecute(
    `UPDATE customers SET
       total_spent = total_spent + ?,
       visit_count = visit_count + 1,
       last_visit_at = ?,
       updated_at = ?
     WHERE id = ?`,
    [amount, now, now, customerId]
  );
}
