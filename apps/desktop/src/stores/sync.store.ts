import { create } from "zustand";

export type SyncStatus = "idle" | "syncing" | "error" | "offline" | "unconfigured";

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  setLastSyncedAt: (at: string) => void;
  setLastError: (err: string | null) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  status: "unconfigured",
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  lastError: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setFailedCount: (failedCount) => set({ failedCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
}));
