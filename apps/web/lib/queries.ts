import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@octapos/shared-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiData {
  totalSales: number;
  totalSalesFormatted: string;
  transactionCount: number;
  avgOrderValue: number;
  avgOrderValueFormatted: string;
  vsYesterdayPct: number | null; // null if no yesterday data
}

export interface DaySales {
  date: string; // "YYYY-MM-DD"
  total: number;
  count: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  quantity: number;
  revenue: number;
  revenueFormatted: string;
}

export interface RecentTransaction {
  id: string;
  invoice_no: string;
  total: number;
  totalFormatted: string;
  payment_method: string;
  status: string;
  created_at: string;
  cashier_id: string;
}

export interface ReportTransaction {
  id: string;
  invoice_no: string;
  total: number;
  totalFormatted: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface PaymentMethodSummary {
  method: string;
  count: number;
  total: number;
  totalFormatted: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  priceFormatted: string;
  category_id: string | null;
  category_name: string | null;
  is_active: boolean;
  unit: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function yesterdayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function nDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// ─── First-tenant resolver ────────────────────────────────────────────────────

/** Resolve tenant_id for a logged-in user by matching their email in the users table. */
export async function resolveTenantId(email: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("email", email)
    .maybeSingle();
  if (userRow?.tenant_id) return userRow.tenant_id as string;

  // Fallback: first tenant in DB (single-tenant setup)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle();
  return (tenant?.id as string) ?? null;
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

interface TxRow { total: number }

export async function getKpiToday(tenantId: string): Promise<KpiData> {
  const supabase = createAdminClient();
  const { start, end } = todayRange();
  const yest = yesterdayRange();

  const [todayRes, yesterdayRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("total")
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("transactions")
      .select("total")
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("created_at", yest.start)
      .lt("created_at", yest.end),
  ]);

  const todayRows = (todayRes.data ?? []) as TxRow[];
  const yesterdayRows = (yesterdayRes.data ?? []) as TxRow[];

  const totalSales = todayRows.reduce((s, r) => s + r.total, 0);
  const count = todayRows.length;
  const avgOrderValue = count > 0 ? totalSales / count : 0;
  const yesterdayTotal = yesterdayRows.reduce((s, r) => s + r.total, 0);
  const vsYesterdayPct =
    yesterdayTotal > 0 ? ((totalSales - yesterdayTotal) / yesterdayTotal) * 100 : null;

  return {
    totalSales,
    totalSalesFormatted: formatCurrency(totalSales),
    transactionCount: count,
    avgOrderValue,
    avgOrderValueFormatted: formatCurrency(avgOrderValue),
    vsYesterdayPct,
  };
}

// ─── Sales chart (7 days) ─────────────────────────────────────────────────────

interface TxDateRow { total: number; created_at: string }

export async function getSalesLast7Days(tenantId: string): Promise<DaySales[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("transactions")
    .select("total, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .gte("created_at", nDaysAgo(7))
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as TxDateRow[];

  const byDate = new Map<string, { total: number; count: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { total: 0, count: 0 });
  }

  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    const existing = byDate.get(key) ?? { total: 0, count: 0 };
    byDate.set(key, { total: existing.total + row.total, count: existing.count + 1 });
  }

  return Array.from(byDate.entries()).map(([date, { total, count }]) => ({
    date,
    total,
    count,
  }));
}

// ─── Top products (7 days) ────────────────────────────────────────────────────

interface TxItemRow {
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  subtotal: number;
}

export async function getTopProducts(tenantId: string, limit = 10): Promise<TopProduct[]> {
  const supabase = createAdminClient();

  // Get paid transaction IDs for the last 7 days
  const { data: txData } = await supabase
    .from("transactions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .gte("created_at", nDaysAgo(7));

  const txIds = ((txData ?? []) as { id: string }[]).map((r) => r.id);
  if (txIds.length === 0) return [];

  const { data: itemData } = await supabase
    .from("transaction_items")
    .select("product_id, product_name_snapshot, quantity, subtotal")
    .in("transaction_id", txIds);

  const items = (itemData ?? []) as TxItemRow[];
  const map = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const item of items) {
    const existing = map.get(item.product_id) ?? { name: item.product_name_snapshot, quantity: 0, revenue: 0 };
    map.set(item.product_id, {
      name: item.product_name_snapshot,
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + item.subtotal,
    });
  }

  return Array.from(map.entries())
    .map(([product_id, { name, quantity, revenue }]) => ({
      product_id,
      name,
      quantity,
      revenue,
      revenueFormatted: formatCurrency(revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ─── Recent transactions ──────────────────────────────────────────────────────

interface TxRecentRow {
  id: string;
  invoice_no: string;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  cashier_id: string;
}

export async function getRecentTransactions(
  tenantId: string,
  limit = 20
): Promise<RecentTransaction[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, invoice_no, total, payment_method, status, created_at, cashier_id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as TxRecentRow[]).map((r) => ({
    ...r,
    totalFormatted: formatCurrency(r.total),
  }));
}

// ─── Reports ──────────────────────────────────────────────────────────────────

interface TxReportRow {
  id: string;
  invoice_no: string;
  total: number;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export async function getReportTransactions(
  tenantId: string,
  from: string,
  to: string
): Promise<{ rows: ReportTransaction[]; summary: PaymentMethodSummary[] }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, invoice_no, total, subtotal, tax_total, discount_total, payment_method, status, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = ((data ?? []) as TxReportRow[]).map((r) => ({
    ...r,
    totalFormatted: formatCurrency(r.total),
  }));

  const methodMap = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    if (r.status !== "paid") continue;
    const existing = methodMap.get(r.payment_method) ?? { count: 0, total: 0 };
    methodMap.set(r.payment_method, {
      count: existing.count + 1,
      total: existing.total + r.total,
    });
  }

  const summary: PaymentMethodSummary[] = Array.from(methodMap.entries()).map(
    ([method, { count, total }]) => ({
      method,
      count,
      total,
      totalFormatted: formatCurrency(total),
    })
  );

  return { rows, summary };
}

// ─── Products ─────────────────────────────────────────────────────────────────

interface ProdRow {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  category_id: string | null;
  is_active: boolean;
  unit: string;
  // Supabase returns joined rows as arrays even for many-to-one joins
  categories: { name: string }[] | null;
}

export async function getProducts(tenantId: string): Promise<ProductListItem[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, price, category_id, is_active, unit, categories(name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  return ((data ?? []) as unknown as ProdRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    priceFormatted: formatCurrency(p.price),
    category_id: p.category_id,
    category_name: p.categories?.[0]?.name ?? null,
    is_active: p.is_active,
    unit: p.unit,
  }));
}
