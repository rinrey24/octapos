import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CashSession } from "@/lib/repositories/shift.repo";

interface ShiftState {
  currentShift: CashSession | null;
  setCurrentShift: (session: CashSession | null) => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      currentShift: null,
      setCurrentShift: (currentShift) => set({ currentShift }),
    }),
    { name: "octapos-shift" }
  )
);
