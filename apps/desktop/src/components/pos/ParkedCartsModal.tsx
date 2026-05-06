import { PauseCircle, Trash2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useParkedStore } from "@/stores/parked.store";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency, formatDateTime } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ParkedCartsModal({ open, onClose }: Props) {
  const { parked, restoreCart, removeParked } = useParkedStore();
  const { items, discountTotal, customerId, customerName, clearCart, setCustomer, setDiscountTotal } = useCartStore();
  const addItemRaw = useCartStore((s) => s.addItem);

  function handleRestore(id: string) {
    if (items.length > 0) {
      toast({ variant: "destructive", title: "Keranjang masih ada isi", description: "Tahan atau kosongkan dulu keranjang aktif." });
      return;
    }
    const saved = restoreCart(id);
    if (!saved) return;
    clearCart();
    for (const item of saved.items) {
      // Restore each item individually by calling addItem for first then updateQty
      addItemRaw({
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name_snapshot: item.product_name_snapshot,
        sku_snapshot: item.sku_snapshot,
        price_snapshot: item.price_snapshot,
        modifiers: item.modifiers,
      });
    }
    setDiscountTotal(saved.discountTotal);
    if (saved.customerId && saved.customerName) {
      setCustomer(saved.customerId, saved.customerName);
    }
    toast({ title: `Transaksi "${saved.label}" dipulihkan` });
    onClose();
  }

  function handleParkCurrent() {
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Keranjang kosong" });
      return;
    }
    const label = `Meja ${parked.length + 1}`;
    useParkedStore.getState().parkCart({ label, items, discountTotal, customerId, customerName });
    clearCart();
    toast({ title: `Transaksi ditahan sebagai "${label}"` });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5" /> Transaksi Ditahan
          </DialogTitle>
        </DialogHeader>

        <Button
          variant="outline"
          className="w-full gap-1"
          onClick={handleParkCurrent}
          disabled={items.length === 0}
        >
          <PauseCircle className="h-4 w-4" />
          Tahan Keranjang Saat Ini
        </Button>

        {parked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi ditahan</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {parked.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.items.length} item · {formatCurrency(
                      p.items.reduce((s, i) => s + i.price_snapshot * i.quantity, 0) - p.discountTotal
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.parkedAt)}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleRestore(p.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeParked(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
