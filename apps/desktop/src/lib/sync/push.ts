import { getSupabaseClient } from "./config";
import { getPendingItems, markSynced, markFailed } from "./queue";
import type { QueueItem } from "./queue";

const BATCH_SIZE = 50;

// Push order must respect FK dependencies
const TABLE_PRIORITY: Record<string, number> = {
  tenants: 0,
  outlets: 1,
  users: 1,
  categories: 2,
  products: 3,
  customers: 3,
  transactions: 4,
  transaction_items: 5,
  transaction_payments: 5,
  stock_movements: 5,
  cash_sessions: 4,
};

function sortByPriority(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const pa = TABLE_PRIORITY[a.table_name] ?? 99;
    const pb = TABLE_PRIORITY[b.table_name] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.created_at < b.created_at ? -1 : 1;
  });
}

function backoffMs(retryCount: number): number {
  return Math.min(1000 * 2 ** retryCount, 30_000);
}

export interface PushResult {
  pushed: number;
  failed: number;
  lastError: string | null;
}

export async function pushPendingItems(): Promise<PushResult> {
  const client = await getSupabaseClient();
  if (!client) return { pushed: 0, failed: 0, lastError: null };

  const items = sortByPriority(await getPendingItems(BATCH_SIZE));
  let pushed = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const item of items) {
    // Respect exponential backoff: skip items that haven't waited long enough
    if (item.retry_count > 0) {
      const waitMs = backoffMs(item.retry_count - 1);
      const createdMs = new Date(item.created_at).getTime();
      if (Date.now() - createdMs < waitMs) continue;
    }

    try {
      const payload = JSON.parse(item.payload) as Record<string, unknown>;

      if (item.action === "delete") {
        const { error } = await client
          .from(item.table_name)
          .update({ deleted_at: payload["deleted_at"] ?? new Date().toISOString() })
          .eq("id", item.row_id);
        if (error) throw new Error(`[${item.table_name}] ${error.message}`);
      } else {
        const { error } = await client
          .from(item.table_name)
          .upsert(payload, { onConflict: "id" });
        if (error) throw new Error(`[${item.table_name}] ${error.message}`);
      }

      await markSynced(item.id);
      pushed++;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await markFailed(item.id, item.retry_count);
      failed++;
    }
  }

  return { pushed, failed, lastError };
}
