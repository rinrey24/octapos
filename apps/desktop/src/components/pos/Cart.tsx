import { useState } from "react";
import { ShoppingCart, User, X, Tag, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { NumPad } from "@/components/ui/numpad";
import { CartItemRow } from "./CartItemRow";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency } from "@octapos/shared-utils";
import { calculateCartTotals } from "@octapos/shared-utils";

interface CartProps {
  taxRate?: number;
  onCheckout: () => void;
  onCustomerClick: () => void;
  onHold: () => void;
}

export function Cart({ taxRate = 0, onCheckout, onCustomerClick, onHold }: CartProps) {
  const { items, discountTotal, setDiscountTotal, clearCart, customerName, setCustomer } = useCartStore();
  const subtotal = useCartStore((s) => s.subtotal());
  const totals = calculateCartTotals(subtotal, discountTotal, taxRate);

  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");

  function openDiscount() {
    setDiscountInput(discountTotal > 0 ? String(discountTotal) : "");
    setDiscountOpen(true);
  }

  function applyDiscount() {
    setDiscountTotal(Number(discountInput) || 0);
    setDiscountOpen(false);
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground p-6">
        <ShoppingCart className="h-16 w-16 opacity-20" />
        <p className="text-sm">Belum ada item</p>
        <p className="text-xs text-center">Ketuk produk di sebelah kiri untuk menambah</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Customer row */}
      <div className="shrink-0 border-b px-3 py-2 flex items-center gap-2">
        <button
          onClick={onCustomerClick}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <User className="h-4 w-4" />
          {customerName ? (
            <span className="font-medium text-foreground">{customerName}</span>
          ) : (
            <span>Tambah pelanggan</span>
          )}
        </button>
        {customerName && (
          <button onClick={() => setCustomer(null, null)} className="ml-auto text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.map((item, i) => (
          <CartItemRow key={`${item.product_id}:${item.variant_id}:${i}`} item={item} />
        ))}
      </div>

      {/* Totals */}
      <div className="shrink-0 border-t bg-card p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">{formatCurrency(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Diskon</span>
            <span className="font-mono text-destructive">-{formatCurrency(discountTotal)}</span>
          </div>
        )}
        {taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pajak ({taxRate}%)</span>
            <span className="font-mono">{formatCurrency(totals.tax_total)}</span>
          </div>
        )}
        {totals.rounding !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pembulatan</span>
            <span className="font-mono">{formatCurrency(totals.rounding)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span className="font-mono text-xl text-primary">{formatCurrency(totals.total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="default" onClick={openDiscount} className="gap-1">
            <Tag className="h-3.5 w-3.5" />
            Diskon
          </Button>
          <Button variant="outline" size="default" onClick={onHold} className="gap-1">
            <PauseCircle className="h-3.5 w-3.5" />
            Tahan
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="default" onClick={clearCart} className="text-destructive border-destructive/30">
            Batal
          </Button>
          <Button size="default" onClick={onCheckout} className="text-base font-bold">
            BAYAR
          </Button>
        </div>
      </div>

      {/* Discount dialog */}
      <Dialog open={discountOpen} onOpenChange={(v) => !v && setDiscountOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Diskon Transaksi</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Jumlah diskon</p>
            <p className="font-mono text-3xl font-bold">
              {discountInput ? formatCurrency(Number(discountInput)) : "Rp 0"}
            </p>
          </div>
          <NumPad value={discountInput} onChange={setDiscountInput} thousands decimal={false} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setDiscountInput("0"); setDiscountTotal(0); setDiscountOpen(false); }}>
              Hapus Diskon
            </Button>
            <Button className="flex-1" onClick={applyDiscount}>Terapkan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
