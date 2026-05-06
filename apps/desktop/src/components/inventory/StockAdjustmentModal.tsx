import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/ui/numpad";
import { adjustStock } from "@/lib/repositories/inventory.repo";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  product: { id: string; name: string; current_qty: number };
  outletId: string;
  onClose: () => void;
  onDone: () => void;
}

export function StockAdjustmentModal({ open, product, outletId, onClose, onDone }: Props) {
  const { session } = useAuthStore();
  const [input, setInput] = useState(String(Math.round(product.current_qty)));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const newQty = Number(input) || 0;
  const diff = newQty - product.current_qty;

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      await adjustStock(outletId, product.id, newQty, session.user.id, note || undefined);
      toast({ title: `Stok ${product.name} diperbarui ke ${newQty}` });
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyesuaikan stok", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{product.name}</p>
        <p className="text-xs text-muted-foreground">Stok saat ini: {product.current_qty}</p>

        <div className="rounded-lg border bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Stok baru</p>
          <p className="font-mono text-4xl font-bold">{input || "0"}</p>
          {diff !== 0 && (
            <p className={`text-sm mt-1 ${diff > 0 ? "text-green-600" : "text-red-500"}`}>
              {diff > 0 ? "+" : ""}{diff.toFixed(0)}
            </p>
          )}
        </div>

        <NumPad value={input} onChange={setInput} thousands={false} decimal={false} />

        <input
          type="text"
          placeholder="Catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={() => { void handleSave(); }} disabled={saving} className="flex-1">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
