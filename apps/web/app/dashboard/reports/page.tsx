import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantId, getReportTransactions } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import ReportFilters from "@/components/reports/ReportFilters";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  edc_debit: "Debit",
  edc_credit: "Kredit",
  transfer: "Transfer",
  split: "Split",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantId = await resolveTenantId(user.email ?? "");
  const params = await searchParams;

  // Default: today
  const todayStr = new Date().toISOString().slice(0, 10);
  const from = typeof params["from"] === "string" ? params["from"] : todayStr;
  const to = typeof params["to"] === "string" ? params["to"] : todayStr;

  const fromISO = `${from}T00:00:00.000Z`;
  const toISO = `${to}T23:59:59.999Z`;

  const { rows, summary } =
    tenantId
      ? await getReportTransactions(tenantId, fromISO, toISO)
      : { rows: [], summary: [] };

  const grandTotal = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
        <p className="text-sm text-muted-foreground">Filter berdasarkan tanggal</p>
      </div>

      <ReportFilters from={from} to={to} />

      {/* Summary by payment method */}
      {summary.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Ringkasan Metode Bayar</h2>
          <div className="flex flex-wrap gap-3">
            {summary.map((s) => (
              <div key={s.method} className="rounded-md border bg-background px-3 py-2 text-sm">
                <p className="font-medium">{METHOD_LABEL[s.method] ?? s.method}</p>
                <p className="font-mono text-base font-bold">{s.totalFormatted}</p>
                <p className="text-xs text-muted-foreground">{s.count} transaksi</p>
              </div>
            ))}
            <div className="rounded-md border bg-primary/5 px-3 py-2 text-sm">
              <p className="font-medium text-primary">Total Semua</p>
              <p className="font-mono text-base font-bold text-primary">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(grandTotal)}
              </p>
              <p className="text-xs text-muted-foreground">{rows.filter((r) => r.status === "paid").length} transaksi</p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">No. Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Waktu</th>
              <th className="px-4 py-3 text-left font-medium">Metode</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Subtotal</th>
              <th className="px-4 py-3 text-right font-medium">Diskon</th>
              <th className="px-4 py-3 text-right font-medium">Pajak</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Tidak ada transaksi dalam periode ini.
                </td>
              </tr>
            ) : (
              rows.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs">{tx.invoice_no}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {new Date(tx.created_at).toLocaleString("id-ID", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5">{METHOD_LABEL[tx.payment_method] ?? tx.payment_method}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={tx.status === "paid" ? "success" : tx.status === "void" ? "destructive" : "secondary"}>
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {new Intl.NumberFormat("id-ID").format(tx.subtotal)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-red-500">
                    {tx.discount_total > 0 ? `-${new Intl.NumberFormat("id-ID").format(tx.discount_total)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {tx.tax_total > 0 ? new Intl.NumberFormat("id-ID").format(tx.tax_total) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{tx.totalFormatted}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
