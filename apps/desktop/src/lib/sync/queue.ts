import { dbExecute, dbSelect } from "@/lib/db";
import { generateId } from "@/lib/uuid";

export type SyncAction = "insert" | "update" | "delete";

export interface QueueItem {
  id: string;
  table_name: string;
  row_id: string;
  action: SyncAction;
  payload: string;
  status: string;
  retry_count: number;
  created_at: string;
}

export async function enqueue(
  tableName: string,
  rowId: string,
  action: SyncAction,
  payload: Record<string, unknown>
): Promise<void> {
  const id = generateId();
  await dbExecute(
    `INSERT INTO sync_queue (id, table_name, row_id, action, payload, status, retry_count, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [id, tableName, rowId, action, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getPendingItems(limit = 50): Promise<QueueItem[]> {
  return dbSelect<QueueItem>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );
}

export async function markSynced(id: string): Promise<void> {
  await dbExecute(
    `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function markFailed(id: string, retryCount: number): Promise<void> {
  const newCount = retryCount + 1;
  const status = newCount >= 5 ? "failed" : "pending";
  await dbExecute(
    `UPDATE sync_queue SET retry_count = ?, status = ? WHERE id = ?`,
    [newCount, status, id]
  );
}

export async function getPendingCount(): Promise<number> {
  const rows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
  );
  return rows[0]?.count ?? 0;
}

export async function getFailedCount(): Promise<number> {
  const rows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'`
  );
  return rows[0]?.count ?? 0;
}

export async function resetFailedItems(): Promise<number> {
  const rows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'`
  );
  const count = rows[0]?.count ?? 0;
  if (count > 0) {
    await dbExecute(
      `UPDATE sync_queue SET status = 'pending', retry_count = 0 WHERE status = 'failed'`
    );
  }
  return count;
}
