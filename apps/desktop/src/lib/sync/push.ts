import { getSupabaseClient } from "./config";
import { getPendingItems, markSynced, markFailed } from "./queue";

const BATCH_SIZE = 50;

function backoffMs(retryCount: number): number {
  return Math.min(1000 * 2 ** retryCount, 30_000);
}

export async function pushPendingItems(): Promise<{ pushed: number; failed: number }> {
  const client = await getSupabaseClient();
  if (!client) return { pushed: 0, failed: 0 };

  const items = await getPendingItems(BATCH_SIZE);
  let pushed = 0;
  let failed = 0;

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
        if (error) throw error;
      } else {
        // INSERT or UPDATE → upsert with version-based LWW
        const { error } = await client
          .from(item.table_name)
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
      }

      await markSynced(item.id);
      pushed++;
    } catch {
      await markFailed(item.id, item.retry_count);
      failed++;
    }
  }

  return { pushed, failed };
}
