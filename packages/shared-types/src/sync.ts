export type SyncStatus = "pending" | "synced" | "failed" | "conflict";

export interface SyncQueueItem {
  id: string;
  table_name: string;
  row_id: string;
  action: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  status: SyncStatus;
  error: string | null;
  created_at: string;
  synced_at: string | null;
  retry_count: number;
}

export interface SyncState {
  status: "idle" | "syncing" | "error" | "offline";
  pending_count: number;
  last_synced_at: string | null;
  last_pulled_at: string | null;
}
