-- ============================================================
-- Fix RLS: Add explicit service_role bypass policies
-- Desktop app syncs using service_role key — must bypass RLS.
-- Web dashboard users are subject to tenant_isolation policies.
-- ============================================================

-- Syntax: TO service_role USING (true) WITH CHECK (true)
-- This allows the service_role Postgres role full access on all sync tables.

CREATE POLICY "service_role_bypass" ON tenants
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON outlets
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON users
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON user_outlets
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON categories
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON products
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON product_variants
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON modifiers
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON modifier_options
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON product_modifiers
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON stock
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON stock_movements
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON transactions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON transaction_items
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON transaction_item_modifiers
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON transaction_payments
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON customers
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON cash_sessions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass" ON audit_log
  TO service_role USING (true) WITH CHECK (true);
