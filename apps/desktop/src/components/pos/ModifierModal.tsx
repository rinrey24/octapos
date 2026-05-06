import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductModifiers, type ModifierWithOptions } from "@/lib/repositories/modifier.repo";
import { formatCurrency } from "@octapos/shared-utils";
import type { ProductWithCategory } from "@octapos/shared-types";

export type CartModifierEntry = {
  modifier_option_id: string;
  name_snapshot: string;
  price_snapshot: number;
};

interface Props {
  open: boolean;
  product: ProductWithCategory | null;
  basePrice: number;
  onConfirm: (modifiers: CartModifierEntry[]) => void;
  onClose: () => void;
}

export function ModifierModal({ open, product, basePrice, onConfirm, onClose }: Props) {
  const [modifiers, setModifiers] = useState<ModifierWithOptions[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({}); // modifierId -> optionIds
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      setSelected({});
      setLoading(true);
      getProductModifiers(product.id)
        .then(setModifiers)
        .catch(() => setModifiers([]))
        .finally(() => setLoading(false));
    }
  }, [open, product]);

  function toggleOption(modifier: ModifierWithOptions, optionId: string) {
    setSelected((prev) => {
      const current = prev[modifier.id] ?? [];
      if (modifier.type === "single") {
        return { ...prev, [modifier.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [modifier.id]: current.filter((id) => id !== optionId) };
      }
      return { ...prev, [modifier.id]: [...current, optionId] };
    });
  }

  const selectedEntries: CartModifierEntry[] = modifiers.flatMap((mod) => {
    const selectedIds = selected[mod.id] ?? [];
    return mod.options
      .filter((o) => selectedIds.includes(o.id))
      .map((o) => ({
        modifier_option_id: o.id,
        name_snapshot: `${mod.name}: ${o.name}`,
        price_snapshot: o.price_delta,
      }));
  });

  const modifierTotal = selectedEntries.reduce((s, m) => s + m.price_snapshot, 0);
  const totalPrice = basePrice + modifierTotal;

  const allRequiredFilled = modifiers
    .filter((m) => m.type === "single")
    .every((m) => (selected[m.id] ?? []).length > 0);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Memuat modifier...</p>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {modifiers.map((mod) => {
              const selectedIds = selected[mod.id] ?? [];
              return (
                <div key={mod.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{mod.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {mod.type === "single" ? "Pilih 1" : "Pilih beberapa"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mod.options.map((opt) => {
                      const isSelected = selectedIds.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(mod, opt.id)}
                          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {opt.name}
                          {opt.price_delta !== 0 && (
                            <span className="ml-1 text-xs opacity-80">
                              {opt.price_delta > 0 ? "+" : ""}{formatCurrency(opt.price_delta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t pt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono font-bold text-lg">{formatCurrency(totalPrice)}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button
            className="flex-1"
            disabled={!allRequiredFilled || loading}
            onClick={() => { onConfirm(selectedEntries); onClose(); }}
          >
            Tambah ke Keranjang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
