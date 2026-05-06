import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/ui/numpad";
import { calcExpectedCash, closeShift } from "@/lib/repositories/shift.repo";
import { useShiftStore } from "@/stores/shift.store";
import { formatCurrency } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CloseShiftModal({ open, onClose }: Props) {
  const { currentShift, setCurrentShift } = useShiftStore();
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && currentShift) {
      calcExpectedCash(currentShift)
        .then(setExpected)
        .catch(() => setExpected(null));
    }
  }, [open, currentShift]);

  if (!currentShift) return null;

  const closingCash = Number(input) || 0;
  const variance = expected !== null ? closingCash - expected : null;

  async function handleClose() {
    if (!currentShift) return;
    setSaving(true);
    try {
      const closed = await closeShift(currentShift.id, closingCash, expected ?? 0, note || undefined);
      setCurrentShift(null);
      toast({
        title: "Shift ditutup!",
        description: variance !== null
          ? `Variance: ${variance >= 0 ? "+" : ""}${formatCurrency(variance)}`
          : undefined,
      });
      onClose();
      // Optionally trigger Z-report print
      void closed; // suppress unused warning
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menutup shift", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tutup Shift Kasir</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-card p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modal awal</span>
            <span className="font-mono">{formatCurrency(currentShift.opening_cash)}</span>
          </div>
          {expected !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kas diharapkan</span>
              <span className="font-mono">{formatCurrency(expected)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span className="text-muted-foreground">Kas aktual (hitung)</span>
            <span className="font-mono">{formatCurrency(closingCash)}</span>
          </div>
          {variance !== null && (
            <div className={`flex justify-between font-bold ${variance < 0 ? "text-destructive" : "text-green-600"}`}>
              <span>Selisih</span>
              <span className="font-mono">{variance >= 0 ? "+" : ""}{formatCurrency(variance)}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Jumlah kas di laci</p>
          <p className="font-mono text-3xl font-bold">{input ? formatCurrency(closingCash) : "Rp 0"}</p>
        </div>

        <NumPad value={input} onChange={setInput} thousands decimal={false} />

        <input
          type="text"
          placeholder="Catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Batal</Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={() => { void handleClose(); }}
            className="flex-1"
          >
            {saving ? "Menutup..." : "Tutup Shift"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
