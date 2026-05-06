import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, ArrowDownToLine, SlidersHorizontal, History } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StockInModal } from "@/components/inventory/StockInModal";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { getStockList, getStockMovements } from "@/lib/repositories/inventory.repo";
import { useAuthStore } from "@/stores/auth.store";
import { formatDateTime } from "@octapos/shared-utils";
import { Toaster } from "@/components/ui/toaster";

type StockEntry = Awaited<ReturnType<typeof getStockList>>[number];

export default function InventoryPage() {
  const { session } = useAuthStore();
  const qc = useQueryClient();
  const outletId = session?.outlet.id ?? "";

  const [stockInTarget, setStockInTarget] = useState<StockEntry | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<StockEntry | null>(null);
  const [historyTarget, setHistoryTarget] = useState<StockEntry | null>(null);

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ["stock-list", outletId],
    queryFn: () => getStockList(outletId),
    enabled: !!outletId,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", outletId, historyTarget?.product_id],
    queryFn: () => getStockMovements(outletId, historyTarget!.product_id),
    enabled: !!historyTarget,
  });

  function handleDone() {
    void qc.invalidateQueries({ queryKey: ["stock-list", outletId] });
    setStockInTarget(null);
    setAdjustTarget(null);
  }

  const lowStock = stocks.filter((s) => s.quantity !== null && s.min_stock !== null && s.quantity <= s.min_stock);

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="shrink-0 border-b bg-card px-6 py-3 flex items-center gap-3">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-semibold text-lg">Inventori</h1>
          {lowStock.length > 0 && (
            <Badge variant="destructive">{lowStock.length} stok rendah</Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Memuat...
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <Package className="h-10 w-10 opacity-30" />
              <p className="text-sm">Belum ada produk dengan stok aktif</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="pb-2 font-medium">Produk</th>
                  <th className="pb-2 font-medium">Kategori</th>
                  <th className="pb-2 font-medium text-right">Stok</th>
                  <th className="pb-2 font-medium text-right">Min. Stok</th>
                  <th className="pb-2 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const qty = s.quantity ?? 0;
                  const isLow = s.min_stock !== null && qty <= s.min_stock;
                  const productForModal = {
                    id: s.product_id,
                    name: s.product_name,
                    current_qty: qty,
                  };
                  return (
                    <tr key={s.product_id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="font-medium">{s.product_name}</div>
                        {s.product_sku && (
                          <div className="text-xs text-muted-foreground font-mono">{s.product_sku}</div>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {s.category_name ?? "—"}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-mono font-semibold ${isLow ? "text-destructive" : ""}`}>
                          {qty}
                        </span>
                        {isLow && <Badge variant="destructive" className="ml-2 text-xs">Rendah</Badge>}
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">
                        {s.min_stock ?? "—"}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => setHistoryTarget(s)}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => setAdjustTarget(s)}
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            Sesuaikan
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setStockInTarget(s)}
                          >
                            <ArrowDownToLine className="h-3 w-3" />
                            Masuk
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {stockInTarget && (
        <StockInModal
          open={!!stockInTarget}
          product={{
            id: stockInTarget.product_id,
            name: stockInTarget.product_name,
            current_qty: stockInTarget.quantity ?? 0,
          }}
          outletId={outletId}
          onClose={() => setStockInTarget(null)}
          onDone={handleDone}
        />
      )}

      {adjustTarget && (
        <StockAdjustmentModal
          open={!!adjustTarget}
          product={{
            id: adjustTarget.product_id,
            name: adjustTarget.product_name,
            current_qty: adjustTarget.quantity ?? 0,
          }}
          outletId={outletId}
          onClose={() => setAdjustTarget(null)}
          onDone={handleDone}
        />
      )}

      {historyTarget && (
        <Dialog open={!!historyTarget} onOpenChange={(v) => !v && setHistoryTarget(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Riwayat Stok — {historyTarget.product_name}</DialogTitle>
            </DialogHeader>
            {movementsLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Memuat...</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada riwayat</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-start justify-between text-sm border-b py-2 last:border-0">
                    <div>
                      <span className={`font-semibold capitalize ${m.type === "sale" || m.type === "out" ? "text-destructive" : "text-green-600"}`}>
                        {m.type}
                      </span>
                      {m.note && <span className="text-muted-foreground ml-2 text-xs">{m.note}</span>}
                      <div className="text-xs text-muted-foreground">{m.user_name} · {formatDateTime(new Date(m.created_at))}</div>
                    </div>
                    <span className={`font-mono font-bold ${m.type === "sale" || m.type === "out" ? "text-destructive" : "text-green-600"}`}>
                      {m.type === "sale" || m.type === "out" ? "-" : "+"}{m.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </AppShell>
  );
}
