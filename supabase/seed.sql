-- ============================================================
-- OctaPOS Seed Data (untuk development/testing)
-- ============================================================

-- Demo Tenant
INSERT INTO tenants (id, name, business_type, created_at, updated_at) VALUES
  ('tenant-demo-001', 'Demo Restoran', 'fnb', NOW(), NOW());

-- Demo Outlet
INSERT INTO outlets (id, tenant_id, name, address, phone, receipt_header, receipt_footer) VALUES
  ('outlet-demo-001', 'tenant-demo-001', 'Cabang Utama', 'Jl. Demo No. 1, Jakarta', '021-12345678',
   'DEMO RESTORAN\nCabang Utama\nJl. Demo No. 1, Jakarta',
   'Terima kasih telah berkunjung!\nSimpan struk ini sebagai bukti pembayaran.');

-- Demo Owner User
INSERT INTO users (id, tenant_id, email, full_name, role, is_active) VALUES
  ('user-owner-001', 'tenant-demo-001', 'owner@demo.com', 'Owner Demo', 'owner', TRUE);

-- Demo Cashier
INSERT INTO users (id, tenant_id, full_name, pin_hash, role, is_active) VALUES
  ('user-cashier-001', 'tenant-demo-001', 'Budi Santoso', '$2b$12$placeholder_hash', 'cashier', TRUE);

-- Map cashier ke outlet
INSERT INTO user_outlets (user_id, outlet_id) VALUES
  ('user-owner-001', 'outlet-demo-001'),
  ('user-cashier-001', 'outlet-demo-001');

-- Demo Categories
INSERT INTO categories (id, tenant_id, name, color, sort_order) VALUES
  ('cat-001', 'tenant-demo-001', 'Makanan', '#FF6B6B', 1),
  ('cat-002', 'tenant-demo-001', 'Minuman', '#4ECDC4', 2),
  ('cat-003', 'tenant-demo-001', 'Snack', '#FFE66D', 3);

-- Demo Products
INSERT INTO products (id, tenant_id, sku, name, category_id, price, cost, tax_rate, is_active, track_stock, unit, created_at, updated_at) VALUES
  ('prod-001', 'tenant-demo-001', 'MKN-001', 'Nasi Goreng', 'cat-001', 25000, 10000, 0, TRUE, FALSE, 'porsi', NOW(), NOW()),
  ('prod-002', 'tenant-demo-001', 'MKN-002', 'Mie Goreng', 'cat-001', 22000, 8000, 0, TRUE, FALSE, 'porsi', NOW(), NOW()),
  ('prod-003', 'tenant-demo-001', 'MNM-001', 'Es Teh Manis', 'cat-002', 5000, 2000, 0, TRUE, FALSE, 'gelas', NOW(), NOW()),
  ('prod-004', 'tenant-demo-001', 'MNM-002', 'Es Jeruk', 'cat-002', 7000, 3000, 0, TRUE, FALSE, 'gelas', NOW(), NOW()),
  ('prod-005', 'tenant-demo-001', 'SNK-001', 'Kerupuk', 'cat-003', 3000, 1000, 0, TRUE, TRUE, 'porsi', NOW(), NOW());
