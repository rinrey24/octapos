import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/ui/numpad";
import { stockIn } from "@/lib/repositories/inventory.repo";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  product: { id: string; name: string; current_qty: number };
  outletId: string;
  onClose: () => void;
  onDone: () => void;
}

export function StockInModal({ open, product, outletId, onClose, onDone }: Props) {
  const { session } = useAuthStore();
  const [input, setInput] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const qty = Number(input) || 0;

  async function handleSave() {
    if (!session || qty <= 0) return;
    setSaving(true);
    try {
      await stockIn(outletId, product.id, qty, session.user.id, note || undefined);
      toast({ title: `Stok masuk ${qty} ${product.name}` });
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal mencatat stok masuk", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Stok Masuk</DialogTitle>
        </DialogHeader>
        <p className="text-sm font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">Stok saat ini: {product.current_qty}</p>

        <div className="rounded-lg border bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Jumlah masuk</p>
          <p className="font-mono text-4xl font-bold text-green-600">+{input || "0"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Menjadi: {product.current_qty + qty}
          </p>
        </div>

        <NumPad value={input} onChange={setInput} thousands={false} decimal={false} />

        <input
          type="text"
          placeholder="Sumber / catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={() => { void handleSave(); }} disabled={saving || qty <= 0} className="flex-1">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
