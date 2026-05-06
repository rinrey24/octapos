import { useState } from "react";
import { CreditCard, Banknote, Smartphone, Building2, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumPad } from "@/components/ui/numpad";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, parseCurrency } from "@octapos/shared-utils";
import type { Transaction } from "@octapos/shared-types";
import type { SplitPaymentEntry } from "@/lib/repositories/transaction.repo";

type Method = Transaction["payment_method"];

interface PaymentModalProps {
  open: boolean;
  total: number;
  onConfirm: (method: Method, paidAmount: number, splitPayments?: SplitPaymentEntry[]) => Promise<void>;
  onClose: () => void;
}

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

const METHODS: { id: Exclude<Method, "split">; label: string; icon: React.ElementType }[] = [
  { id: "cash", label: "Tunai", icon: Banknote },
  { id: "qris", label: "QRIS", icon: Smartphone },
  { id: "edc_debit", label: "Debit", icon: CreditCard },
  { id: "edc_credit", label: "Kredit", icon: CreditCard },
  { id: "transfer", label: "Transfer", icon: Building2 },
];

export function PaymentModal({ open, total, onConfirm, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState<Exclude<Method, "split">>("cash");
  const [cashInput, setCashInput] = useState("");
  const [edcRef, setEdcRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitEntries, setSplitEntries] = useState<SplitPaymentEntry[]>([
    { method: "cash", amount: 0 },
  ]);

  const paidAmount = method === "cash"
    ? (cashInput ? parseCurrency(cashInput) || Number(cashInput) : total)
    : total;

  const change = Math.max(0, paidAmount - total);
  const canConfirm = method !== "cash" || paidAmount >= total;

  const splitTotal = splitEntries.reduce((s, e) => s + e.amount, 0);
  const splitCanConfirm = splitEntries.length > 0 && splitTotal >= total;

  function handleSplitEntryMethod(idx: number, m: Exclude<Method, "split">) {
    setSplitEntries((prev) => prev.map((e, i) => i === idx ? { ...e, method: m } : e));
  }

  function handleSplitEntryAmount(idx: number, val: string) {
    const amount = Number(val.replace(/\D/g, "")) || 0;
    setSplitEntries((prev) => prev.map((e, i) => i === idx ? { ...e, amount } : e));
  }

  function addSplitEntry() {
    setSplitEntries((prev) => [...prev, { method: "cash", amount: 0 }]);
  }

  function removeSplitEntry(idx: number) {
    setSplitEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      if (splitMode) {
        await onConfirm("split", splitTotal, splitEntries);
      } else {
        const finalMethod = method;
        const refEntry: SplitPaymentEntry[] | undefined = edcRef
          ? [{ method: finalMethod, amount: paidAmount, referenceNo: edcRef }]
          : undefined;
        await onConfirm(finalMethod, paidAmount, refEntry);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleNumPadChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    setCashInput(digits);
  }

  const isEdc = method === "edc_debit" || method === "edc_credit";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Left: method + input */}
          <div className="flex-1 space-y-3">
            {/* Split toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!splitMode ? "default" : "outline"}
                className="text-xs"
                onClick={() => setSplitMode(false)}
              >
                Bayar Penuh
              </Button>
              <Button
                size="sm"
                variant={splitMode ? "default" : "outline"}
                className="text-xs"
                onClick={() => setSplitMode(true)}
              >
                Split Bayar
              </Button>
            </div>

            {!splitMode ? (
              <>
                {/* Payment methods */}
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      variant={method === id ? "default" : "outline"}
                      className="flex-col gap-1 h-16 text-xs"
                      onClick={() => { setMethod(id); setEdcRef(""); }}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Button>
                  ))}
                </div>

                {method === "cash" && (
                  <>
                    <div className="rounded-lg border bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Uang yang diterima</p>
                      <p className="font-mono text-3xl font-bold">
                        {cashInput ? formatCurrency(Number(cashInput)) : formatCurrency(total)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setCashInput(String(total))}>
                        Uang Pas
                      </Button>
                      {QUICK_AMOUNTS.filter((a) => a >= total).slice(0, 3).map((a) => (
                        <Button key={a} variant="outline" size="sm" className="text-xs font-mono"
                          onClick={() => setCashInput(String(a))}>
                          {formatCurrency(a)}
                        </Button>
                      ))}
                    </div>
                    <NumPad value={cashInput} onChange={handleNumPadChange} thousands decimal={false} />
                  </>
                )}

                {method === "qris" && (
                  <div className="rounded-lg border bg-muted/50 p-6 text-center space-y-2">
                    <Smartphone className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Minta pelanggan scan QR di mesin QRIS</p>
                    <p className="font-mono text-2xl font-bold text-foreground">{formatCurrency(total)}</p>
                  </div>
                )}

                {isEdc && (
                  <div className="space-y-2">
                    <div className="rounded-lg border bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">Tagih via mesin EDC</p>
                      <p className="font-mono text-2xl font-bold text-foreground mt-1">{formatCurrency(total)}</p>
                    </div>
                    <Input
                      placeholder="No. referensi (opsional)"
                      value={edcRef}
                      onChange={(e) => setEdcRef(e.target.value)}
                    />
                  </div>
                )}

                {method === "transfer" && (
                  <div className="rounded-lg border bg-muted/50 p-6 text-center">
                    <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Transfer bank sebesar</p>
                    <p className="font-mono text-2xl font-bold text-foreground mt-1">{formatCurrency(total)}</p>
                  </div>
                )}
              </>
            ) : (
              /* Split payment entries */
              <div className="space-y-2">
                {splitEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={entry.method}
                      onChange={(e) => handleSplitEntryMethod(idx, e.target.value as Exclude<Method, "split">)}
                      className="rounded-md border bg-background px-2 py-1.5 text-sm"
                    >
                      {METHODS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                    <Input
                      className="font-mono text-right"
                      placeholder="Jumlah"
                      value={entry.amount > 0 ? String(entry.amount) : ""}
                      onChange={(e) => handleSplitEntryAmount(idx, e.target.value)}
                    />
                    {splitEntries.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeSplitEntry(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1 w-full" onClick={addSplitEntry}>
                  <Plus className="h-4 w-4" /> Tambah Metode
                </Button>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Terbayar</span>
                  <span className={`font-mono font-semibold ${splitTotal >= total ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(splitTotal)} / {formatCurrency(total)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: summary + confirm */}
          <div className="w-52 flex flex-col gap-3">
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-bold">{formatCurrency(total)}</span>
              </div>
              {!splitMode && method === "cash" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dibayar</span>
                    <span className="font-mono">{formatCurrency(paidAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">Kembalian</span>
                    <span className="font-mono text-xl font-bold text-green-600">{formatCurrency(change)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            <Button
              size="lg"
              className="w-full text-base font-bold h-16"
              disabled={splitMode ? (!splitCanConfirm || loading) : (!canConfirm || loading)}
              onClick={() => { void handleConfirm(); }}
            >
              {loading ? "Memproses..." : "KONFIRMASI"}
            </Button>
            <Button variant="outline" size="default" onClick={onClose} disabled={loading}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
