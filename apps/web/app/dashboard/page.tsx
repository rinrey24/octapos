import { redirect } from "next/navigation";
import { ShoppingCart, Receipt, TrendingUp, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  resolveTenantId,
  getKpiToday,
  getSalesLast7Days,
  getTopProducts,
  getRecentTransactions,
} from "@/lib/queries";
import KpiCard from "@/components/dashboard/KpiCard";
import SalesChart from "@/components/dashboard/SalesChart";
import TopProducts from "@/components/dashboard/TopProducts";
import RecentFeed from "@/components/dashboard/RecentFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantId = await resolveTenantId(user.email ?? "");

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">
          Tidak ditemukan data tenant. Pastikan aplikasi desktop sudah dijalankan dan data tersinkron.
        </p>
      </div>
    );
  }

  const [kpi, salesChart, topProducts, recentTx] = await Promise.all([
    getKpiToday(tenantId),
    getSalesLast7Days(tenantId),
    getTopProducts(tenantId),
    getRecentTransactions(tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan penjualan hari ini</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Penjualan Hari Ini"
          value={kpi.totalSalesFormatted}
          pct={kpi.vsYesterdayPct}
          subtitle="vs kemarin"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Jumlah Transaksi"
          value={String(kpi.transactionCount)}
          subtitle="transaksi paid"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          title="Rata-rata Transaksi"
          value={kpi.avgOrderValueFormatted}
          subtitle="per transaksi"
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <KpiCard
          title="Top Produk"
          value={topProducts[0]?.name ?? "—"}
          subtitle={topProducts[0] ? `${topProducts[0].quantity} terjual` : "belum ada data"}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesChart data={salesChart} />
        <TopProducts data={topProducts} />
      </div>

      {/* Recent feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentFeed tenantId={tenantId} initial={recentTx} />
      </div>
    </div>
  );
}
