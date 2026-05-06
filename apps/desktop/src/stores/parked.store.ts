import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@octapos/shared-types";

export interface ParkedCart {
  id: string;
  label: string;
  items: CartItem[];
  discountTotal: number;
  customerId: string | null;
  customerName: string | null;
  parkedAt: string;
}

interface ParkedState {
  parked: ParkedCart[];
  openModal: boolean;
  parkCart: (cart: Omit<ParkedCart, "id" | "parkedAt">) => string;
  restoreCart: (id: string) => ParkedCart | null;
  removeParked: (id: string) => void;
  setOpenModal: (v: boolean) => void;
}

export const useParkedStore = create<ParkedState>()(persist(
  (set, get) => ({
    parked: [],
    openModal: false,

    setOpenModal: (v) => set({ openModal: v }),

    parkCart: (cart) => {
      const id = `park-${Date.now()}`;
      const entry: ParkedCart = { ...cart, id, parkedAt: new Date().toISOString() };
      set((s) => ({ parked: [...s.parked, entry] }));
      return id;
    },

    restoreCart: (id) => {
      const found = get().parked.find((p) => p.id === id) ?? null;
      if (found) {
        set((s) => ({ parked: s.parked.filter((p) => p.id !== id) }));
      }
      return found;
    },

    removeParked: (id) => {
      set((s) => ({ parked: s.parked.filter((p) => p.id !== id) }));
    },
  }),
  {
    name: "octapos-parked-carts",
    partialize: (s) => ({ parked: s.parked }),
  }
));
