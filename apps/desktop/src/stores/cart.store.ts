import { create } from "zustand";
import type { CartItem } from "@octapos/shared-types";

interface CartState {
  items: CartItem[];
  notes: string | null;
  discountTotal: number;
  customerId: string | null;
  customerName: string | null;

  addItem: (item: Omit<CartItem, "quantity" | "discount" | "notes">) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQty: (productId: string, variantId: string | null | undefined, qty: number) => void;
  updateDiscount: (productId: string, variantId: string | null | undefined, discount: number) => void;
  setNotes: (notes: string | null) => void;
  setDiscountTotal: (discount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  clearCart: () => void;

  subtotal: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  notes: null,
  discountTotal: 0,
  customerId: null,
  customerName: null,

  addItem: (itemData) => {
    set((state) => {
      // Only merge if no modifiers (items with modifiers are always separate rows)
      const hasModifiers = itemData.modifiers.length > 0;
      const existing = !hasModifiers
        ? state.items.find(
            (i) => i.product_id === itemData.product_id && i.variant_id === itemData.variant_id && i.modifiers.length === 0
          )
        : undefined;

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === itemData.product_id && i.variant_id === itemData.variant_id && i.modifiers.length === 0
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { ...itemData, quantity: 1, discount: 0, notes: null },
        ],
      };
    });
  },

  removeItem: (productId, variantId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.product_id === productId && i.variant_id === (variantId ?? null))
      ),
    }));
  },

  updateQty: (productId, variantId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId, variantId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId && i.variant_id === (variantId ?? null)
          ? { ...i, quantity: qty }
          : i
      ),
    }));
  },

  updateDiscount: (productId, variantId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId && i.variant_id === (variantId ?? null)
          ? { ...i, discount }
          : i
      ),
    }));
  },

  setNotes: (notes) => set({ notes }),
  setDiscountTotal: (discountTotal) => set({ discountTotal }),
  setCustomer: (customerId, customerName) => set({ customerId, customerName }),

  clearCart: () => set({ items: [], notes: null, discountTotal: 0, customerId: null, customerName: null }),

  subtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const modTotal = item.modifiers.reduce((s, m) => s + m.price_snapshot, 0);
      return sum + (item.price_snapshot + modTotal) * item.quantity - item.discount;
    }, 0);
  },
}));
