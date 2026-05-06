import { dbSelect, dbExecute } from "@/lib/db";
import { hashSecret, verifySecret } from "@/lib/crypto";
import { generateId } from "@/lib/uuid";
import { enqueue } from "@/lib/sync/queue";
import type { User, Tenant, Outlet } from "@octapos/shared-types";

export interface DbUser extends User {
  password_hash: string | null;
  pin_hash: string | null;
}

/** Ambil semua user aktif di tenant. */
export async function getUsers(tenantId: string): Promise<User[]> {
  return dbSelect<User>(
    `SELECT id, tenant_id, email, full_name, role, is_active, last_login_at
     FROM users WHERE tenant_id = ? AND is_active = 1 ORDER BY full_name ASC`,
    [tenantId]
  );
}

/** Ambil kasir (role = cashier) untuk ditampilkan di login list. */
export async function getCashiers(tenantId: string): Promise<User[]> {
  return dbSelect<User>(
    `SELECT id, tenant_id, email, full_name, role, is_active, last_login_at
     FROM users WHERE tenant_id = ? AND is_active = 1
     AND role IN ('cashier','supervisor') ORDER BY full_name ASC`,
    [tenantId]
  );
}

/** Login owner/admin: verifikasi email + password. */
export async function loginOwner(
  email: string,
  password: string
): Promise<User | null> {
  const rows = await dbSelect<DbUser & { password_hash: string }>(
    `SELECT * FROM users WHERE email = ? AND role IN ('owner','admin') AND is_active = 1`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.password_hash) return null;

  const valid = await verifySecret(password, user.password_hash);
  if (!valid) return null;

  await dbExecute(`UPDATE users SET last_login_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    user.id,
  ]);

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    last_login_at: user.last_login_at,
  };
}

/** Login kasir: verifikasi PIN. */
export async function loginCashier(
  userId: string,
  pin: string
): Promise<User | null> {
  const rows = await dbSelect<DbUser>(
    `SELECT * FROM users WHERE id = ? AND is_active = 1`,
    [userId]
  );
  const user = rows[0];
  if (!user || !user.pin_hash) return null;

  const valid = await verifySecret(pin, user.pin_hash);
  if (!valid) return null;

  await dbExecute(`UPDATE users SET last_login_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    user.id,
  ]);

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    last_login_at: user.last_login_at,
  };
}

/** Ambil tenant pertama yang ada (untuk Phase 1 single-tenant). */
export async function getFirstTenant(): Promise<Tenant | null> {
  const rows = await dbSelect<Tenant>(`SELECT * FROM tenants LIMIT 1`);
  return rows[0] ?? null;
}

/** Ambil outlet pertama milik tenant. */
export async function getFirstOutlet(tenantId: string): Promise<Outlet | null> {
  const rows = await dbSelect<Outlet>(
    `SELECT * FROM outlets WHERE tenant_id = ? LIMIT 1`,
    [tenantId]
  );
  return rows[0] ?? null;
}

/** Cek apakah database sudah di-setup (ada tenant). */
export async function isSetupDone(): Promise<boolean> {
  const rows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count FROM tenants`
  );
  return (rows[0]?.count ?? 0) > 0;
}

/** Buat owner user baru. */
export async function createOwner(
  tenantId: string,
  email: string,
  fullName: string,
  password: string
): Promise<User> {
  const id = generateId();
  const passwordHash = await hashSecret(password);
  const now = new Date().toISOString();

  await dbExecute(
    `INSERT INTO users (id, tenant_id, email, full_name, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?, 'owner', 1)`,
    [id, tenantId, email, fullName, passwordHash]
  );

  return { id, tenant_id: tenantId, email, full_name: fullName, role: "owner", is_active: true, last_login_at: null };
}

/** Buat kasir baru dengan PIN. */
export async function createCashier(
  tenantId: string,
  fullName: string,
  pin: string
): Promise<User> {
  const id = generateId();
  const pinHash = await hashSecret(pin);

  await dbExecute(
    `INSERT INTO users (id, tenant_id, full_name, pin_hash, role, is_active)
     VALUES (?, ?, ?, ?, 'cashier', 1)`,
    [id, tenantId, fullName, pinHash]
  );

  await enqueue("users", id, "insert", {
    id, tenant_id: tenantId, full_name: fullName, role: "cashier", is_active: true,
  });

  return { id, tenant_id: tenantId, email: null, full_name: fullName, role: "cashier", is_active: true, last_login_at: null };
}

/** Nonaktifkan user (soft delete). */
export async function deactivateUser(userId: string): Promise<void> {
  await dbExecute(`UPDATE users SET is_active = 0 WHERE id = ?`, [userId]);

  const rows = await dbSelect<{ id: string; tenant_id: string; email: string | null; full_name: string; role: string }>(
    `SELECT id, tenant_id, email, full_name, role FROM users WHERE id = ?`, [userId]
  );
  const u = rows[0];
  if (u) {
    await enqueue("users", userId, "insert", {
      id: u.id, tenant_id: u.tenant_id, email: u.email, full_name: u.full_name,
      role: u.role, is_active: false,
    });
  }
}

/** Update PIN kasir. */
export async function updateUserPin(userId: string, newPin: string): Promise<void> {
  const pinHash = await hashSecret(newPin);
  await dbExecute(`UPDATE users SET pin_hash = ? WHERE id = ?`, [pinHash, userId]);
}
