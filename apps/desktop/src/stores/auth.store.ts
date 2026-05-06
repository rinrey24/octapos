import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Outlet, Tenant } from "@octapos/shared-types";

export interface AppSession {
  user: User;
  outlet: Outlet;
  tenant: Tenant;
}

interface AuthState {
  session: AppSession | null;
  setSession: (session: AppSession) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    { name: "octapos-auth" }
  )
);
