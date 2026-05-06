import { dbExecute } from "@/lib/db";
import { hashSecret } from "@/lib/crypto";
import { generateId } from "@/lib/uuid";
import { isSetupDone } from "@/lib/repositories/auth.repo";
import { enqueue } from "@/lib/sync/queue";

/**
 * Inisialisasi data awal saat pertama kali aplikasi dijalankan.
 * Membuat: 1 tenant, 1 outlet, 1 owner, 1 kasir demo.
 */
export async function seedInitialData(opts: {
  tenantName: string;
  outletName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName: string;
}): Promise<{ tenantId: string; outletId: string }> {
  const now = new Date().toISOString();
  const tenantId = generateId();
  const outletId = generateId();
  const ownerId = generateId();
  const cashierId = generateId();

  const ownerHash = await hashSecret(opts.ownerPassword);
  const cashierPinHash = await hashSecret("123456");

  await dbExecute(
    `INSERT INTO tenants (id, name, business_type, created_at, updated_at) VALUES (?,?,'retail',?,?)`,
    [tenantId, opts.tenantName, now, now]
  );

  await dbExecute(
    `INSERT INTO outlets (id, tenant_id, name, receipt_header, receipt_footer)
     VALUES (?,?,?,?,?)`,
    [
      outletId, tenantId, opts.outletName,
      `${opts.tenantName}\n${opts.outletName}`,
      "Terima kasih telah berkunjung!",
    ]
  );

  await dbExecute(
    `INSERT INTO users (id, tenant_id, email, full_name, password_hash, role, is_active)
     VALUES (?,?,?,?,?,'owner',1)`,
    [ownerId, tenantId, opts.ownerEmail, opts.ownerName, ownerHash]
  );

  // Kasir demo dengan PIN 123456
  await dbExecute(
    `INSERT INTO users (id, tenant_id, full_name, pin_hash, role, is_active)
     VALUES (?,?,?,?,'cashier',1)`,
    [cashierId, tenantId, "Kasir Demo", cashierPinHash]
  );

  await dbExecute(
    `INSERT INTO user_outlets (user_id, outlet_id) VALUES (?,?)`,
    [ownerId, outletId]
  );
  await dbExecute(
    `INSERT INTO user_outlets (user_id, outlet_id) VALUES (?,?)`,
    [cashierId, outletId]
  );

  // Simpan setting bahwa setup sudah selesai
  await dbExecute(
    `INSERT INTO app_settings (key, value) VALUES ('setup_done', 'true')`,
    []
  );

  // Enqueue to sync queue so cloud sync picks these up
  await enqueue("tenants", tenantId, "insert", {
    id: tenantId, name: opts.tenantName, business_type: "retail", created_at: now, updated_at: now,
  });
  await enqueue("outlets", outletId, "insert", {
    id: outletId, tenant_id: tenantId, name: opts.outletName,
    receipt_header: `${opts.tenantName}\n${opts.outletName}`,
    receipt_footer: "Terima kasih telah berkunjung!",
  });
  await enqueue("users", ownerId, "insert", {
    id: ownerId, tenant_id: tenantId, email: opts.ownerEmail,
    full_name: opts.ownerName, role: "owner", is_active: true,
  });
  await enqueue("users", cashierId, "insert", {
    id: cashierId, tenant_id: tenantId, full_name: "Kasir Demo",
    role: "cashier", is_active: true,
  });

  return { tenantId, outletId };
}

/** Cek dan jalankan seed hanya jika belum pernah dilakukan. */
export async function runSeedIfNeeded(): Promise<boolean> {
  const done = await isSetupDone();
  return done;
}
