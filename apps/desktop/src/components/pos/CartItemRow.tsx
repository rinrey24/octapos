import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@octapos/shared-utils";
import { useCartStore } from "@/stores/cart.store";
import type { CartItem } from "@octapos/shared-types";

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQty, removeItem } = useCartStore();
  const modifierTotal = item.modifiers.reduce((s, m) => s + m.price_snapshot, 0);
  const unitPrice = item.price_snapshot + modifierTotal;
  const lineTotal = unitPrice * item.quantity - item.discount;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.product_name_snapshot}</p>
        {item.modifiers.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {item.modifiers.map((m) => m.name_snapshot).join(", ")}
          </p>
        )}
        <p className="font-mono text-xs text-muted-foreground">
          {formatCurrency(unitPrice)} × {item.quantity}
        </p>
        {item.discount > 0 && (
          <p className="text-xs text-destructive">-{formatCurrency(item.discount)}</p>
        )}
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 min-h-0 min-w-0"
          onClick={() => updateQty(item.product_id, item.variant_id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-mono text-sm font-bold">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 min-h-0 min-w-0"
          onClick={() => updateQty(item.product_id, item.variant_id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 min-h-0 min-w-0 text-destructive hover:text-destructive"
          onClick={() => removeItem(item.product_id, item.variant_id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Line total */}
      <div className="w-24 text-right">
        <span className="font-mono text-sm font-bold">{formatCurrency(lineTotal)}</span>
      </div>
    </div>
  );
}
