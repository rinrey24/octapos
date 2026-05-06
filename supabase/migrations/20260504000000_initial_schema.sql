-- ============================================================
-- OctaPOS Initial Schema for Supabase (Postgres)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANT & OUTLET
-- ============================================================

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'retail',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE outlets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  receipt_header TEXT,
  receipt_footer TEXT
);

-- ============================================================
-- USERS & ROLES
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  pin_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'supervisor', 'cashier')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ
);

CREATE TABLE user_outlets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id TEXT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, outlet_id)
);

-- ============================================================
-- MASTER DATA: PRODUK & KATEGORI
-- ============================================================

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  price NUMERIC(15,2) NOT NULL,
  cost NUMERIC(15,2),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  track_stock BOOLEAN NOT NULL DEFAULT TRUE,
  unit TEXT NOT NULL DEFAULT 'pcs',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier NUMERIC(15,2) NOT NULL DEFAULT 0,
  sku TEXT
);

CREATE TABLE modifiers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'multiple'))
);

CREATE TABLE modifier_options (
  id TEXT PRIMARY KEY,
  modifier_id TEXT NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE TABLE product_modifiers (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  modifier_id TEXT NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, modifier_id)
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE stock (
  outlet_id TEXT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (outlet_id, product_id)
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN ('in','out','adjustment','transfer_in','transfer_out','sale','void')),
  quantity NUMERIC(15,3) NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  note TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  outlet_id TEXT NOT NULL REFERENCES outlets(id),
  invoice_no TEXT NOT NULL UNIQUE,
  cashier_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT,
  subtotal NUMERIC(15,2) NOT NULL,
  discount_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(15,2) NOT NULL DEFAULT 0,
  rounding NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  paid_amount NUMERIC(15,2) NOT NULL,
  change_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','paid','void','refunded')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','qris','edc_debit','edc_credit','transfer','split')),
  notes TEXT,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  device_id TEXT NOT NULL
);

CREATE TABLE transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT,
  price_snapshot NUMERIC(15,2) NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(15,2) NOT NULL,
  notes TEXT
);

CREATE TABLE transaction_item_modifiers (
  item_id TEXT NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
  modifier_option_id TEXT NOT NULL REFERENCES modifier_options(id),
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(15,2) NOT NULL,
  PRIMARY KEY (item_id, modifier_option_id)
);

CREATE TABLE transaction_payments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash','qris','edc_debit','edc_credit','transfer','split')),
  amount NUMERIC(15,2) NOT NULL,
  reference_no TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS (optional)
-- ============================================================

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_spent NUMERIC(15,2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ
);

-- ============================================================
-- CASH SESSIONS (SHIFT)
-- ============================================================

CREATE TABLE cash_sessions (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(id),
  cashier_id TEXT NOT NULL REFERENCES users(id),
  opening_cash NUMERIC(15,2) NOT NULL,
  closing_cash NUMERIC(15,2),
  expected_cash NUMERIC(15,2),
  variance NUMERIC(15,2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  synced_at TIMESTAMPTZ
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_transactions_outlet_created ON transactions(outlet_id, created_at DESC);
CREATE INDEX idx_transactions_tenant_created ON transactions(tenant_id, created_at DESC);
CREATE INDEX idx_transactions_synced_at ON transactions(synced_at);
CREATE INDEX idx_products_tenant_barcode ON products(tenant_id, barcode);
CREATE INDEX idx_products_synced_at ON products(synced_at);
CREATE INDEX idx_stock_outlet_product ON stock(outlet_id, product_id);
CREATE INDEX idx_stock_movements_outlet ON stock_movements(outlet_id, created_at DESC);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: setiap user hanya bisa akses data tenant-nya sendiri
-- (tenant_id diambil dari JWT claim 'app_metadata.tenant_id')

CREATE POLICY "tenant_isolation" ON tenants
  USING (id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON outlets
  USING (tenant_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON users
  USING (tenant_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON categories
  USING (tenant_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON products
  USING (tenant_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON transactions
  USING (tenant_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON audit_log
  USING (tenant_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id');
