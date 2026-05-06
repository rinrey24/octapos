import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Ban, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth.store";
import { getTransactions, getTransactionDetail, voidTransaction, type TransactionWithItems } from "@/lib/repositories/transaction.repo";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { formatCurrency, formatDateTime } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default", draft: "secondary", void: "destructive", refunded: "outline",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai", qris: "QRIS", edc_debit: "Debit",
  edc_credit: "Kredit", transfer: "Transfer", split: "Campuran",
};

export default function TransactionsPage() {
  const { session } = useAuthStore();
  const qc = useQueryClient();
  const outletId = session?.outlet.id ?? "";

  const [detail, setDetail] = useState<TransactionWithItems | null>(null);
  const [voidTarget, setVoidTarget] = useState<TransactionWithItems | null>(null);
  const [printTx, setPrintTx] = useState<TransactionWithItems | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const isCashier = session?.user.role === "cashier";
  const cashierFilter = isCashier ? session?.user.id : undefined;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", outletId, cashierFilter],
    queryFn: () => getTransactions(outletId, 100, cashierFilter),
    enabled: !!outletId,
    refetchInterval: 10_000,
  });

  async function openDetail(id: string) {
    const tx = await getTransactionDetail(id);
    if (tx) setDetail(tx);
  }

  async function openVoid(id: string) {
    const tx = await getTransactionDetail(id);
    if (tx) {
      setVoidTarget(tx);
      setVoidReason("");
    }
  }

  async function handleVoid() {
    if (!voidTarget || !session || !voidReason.trim()) return;
    setVoiding(true);
    try {
      await voidTransaction(voidTarget.id, session.user.id, voidReason.trim(), outletId);
      toast({ title: "Transaksi divoid", description: voidTarget.invoice_no });
      await qc.invalidateQueries({ queryKey: ["transactions", outletId] });
      setVoidTarget(null);
      setDetail(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal void", description: String(e) });
    } finally {
      setVoiding(false);
    }
  }

  const canVoid = session?.user.role !== "cashier";

  return (
    <AppShell>
      <div className="flex h-full flex-col p-4 gap-3">
        <h2 className="text-xl font-semibold">Riwayat Transaksi</h2>

        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Invoice</th>
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-left p-3 font-medium">Kasir</th>
                <th className="text-left p-3 font-medium">Pelanggan</th>
                <th className="text-left p-3 font-medium">Metode</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="w-20 p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
              )}
              {!isLoading && transactions.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Belum ada transaksi</td></tr>
              )}
              {transactions.map((tx, i) => (
                <tr key={tx.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="p-3 font-mono text-xs font-medium">{tx.invoice_no}</td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDateTime(tx.created_at)}</td>
                  <td className="p-3">{tx.cashier_name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{tx.customer_name ?? "—"}</td>
                  <td className="p-3">{METHOD_LABEL[tx.payment_method] ?? tx.payment_method}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatCurrency(tx.total)}</td>
                  <td className="p-3 text-center">
                    <Badge variant={STATUS_VARIANT[tx.status] ?? "outline"}>{tx.status}</Badge>
                  </td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0" onClick={() => openDetail(tx.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 text-muted-foreground"
                      onClick={async () => { const d = await getTransactionDetail(tx.id); if (d) setPrintTx(d); }}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    {canVoid && tx.status === "paid" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 text-destructive" onClick={() => openVoid(tx.id)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-right">
          {transactions.length} transaksi · auto-refresh setiap 10 detik
        </p>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono font-medium">{detail.invoice_no}</span>
                <span className="text-muted-foreground">Waktu</span>
                <span>{formatDateTime(detail.created_at)}</span>
                <span className="text-muted-foreground">Kasir</span>
                <span>{detail.cashier_name}</span>
                {detail.customer_id && (
                  <>
                    <span className="text-muted-foreground">Pelanggan</span>
                    <span>{detail.customer_id}</span>
                  </>
                )}
                <span className="text-muted-foreground">Metode</span>
                <span>{METHOD_LABEL[detail.payment_method] ?? detail.payment_method}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge variant={STATUS_VARIANT[detail.status] ?? "outline"} className="w-fit">{detail.status}</Badge>
                {detail.void_reason && (
                  <>
                    <span className="text-muted-foreground">Alasan Void</span>
                    <span className="text-destructive">{detail.void_reason}</span>
                  </>
                )}
              </div>
              <Separator />
              <div className="space-y-1">
                {detail.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {item.product_name_snapshot} ×{item.quantity}
                    </span>
                    <span className="font-mono">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1">
                {detail.discount_total > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="text-destructive font-mono">-{formatCurrency(detail.discount_total)}</span>
                  </div>
                )}
                {detail.tax_total > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pajak</span>
                    <span className="font-mono">{formatCurrency(detail.tax_total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(detail.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Dibayar</span>
                  <span className="font-mono">{formatCurrency(detail.paid_amount)}</span>
                </div>
                {detail.change_amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span className="font-mono text-green-600">{formatCurrency(detail.change_amount)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPrintTx(detail)}
                >
                  <Printer className="h-4 w-4 mr-1" /> Cetak Struk
                </Button>
                {canVoid && detail.status === "paid" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setDetail(null); void openVoid(detail.id); }}
                  >
                    <Ban className="h-4 w-4 mr-1" /> Void
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void confirmation dialog */}
      <Dialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Void Transaksi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Invoice <strong className="font-mono">{voidTarget?.invoice_no}</strong> sebesar{" "}
            <strong>{voidTarget ? formatCurrency(voidTarget.total) : ""}</strong> akan divoid. Stok akan dikembalikan.
          </p>
          <div>
            <label className="text-sm font-medium">Alasan void *</label>
            <Input
              className="mt-1"
              placeholder="Contoh: salah order, pelanggan batal"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setVoidTarget(null)} disabled={voiding}>Batal</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!voidReason.trim() || voiding}
              onClick={() => { void handleVoid(); }}
            >
              {voiding ? "Memproses..." : "Konfirmasi Void"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {printTx && (
        <ReceiptModal
          open={!!printTx}
          transaction={printTx}
          items={printTx.items}
          outletName={session?.outlet.name ?? ""}
          cashierName={printTx.cashier_name ?? ""}
          onClose={() => setPrintTx(null)}
        />
      )}

      <Toaster />
    </AppShell>
  );
}
