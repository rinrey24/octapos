import { pushPendingItems } from "./push";
import { pullRemoteChanges } from "./pull";
import { getPendingCount, getFailedCount } from "./queue";
import { getSupabaseClient } from "./config";
import { useSyncStore } from "@/stores/sync.store";

const INTERVAL_MS = 30_000;

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _tenantId: string | null = null;

async function runSync(): Promise<void> {
  const store = useSyncStore.getState();

  if (!navigator.onLine) {
    store.setStatus("offline");
    store.setPendingCount(await getPendingCount());
    return;
  }

  const client = await getSupabaseClient();
  if (!client) {
    store.setStatus("unconfigured");
    return;
  }

  store.setStatus("syncing");

  try {
    const [pushResult, pullResult] = await Promise.allSettled([
      pushPendingItems(),
      _tenantId ? pullRemoteChanges(_tenantId) : Promise.resolve({ pulled: 0 }),
    ]);

    const [pending, failed] = await Promise.all([getPendingCount(), getFailedCount()]);
    store.setPendingCount(pending);
    store.setFailedCount(failed);

    const pushFailed = pushResult.status === "rejected"
      || (pushResult.status === "fulfilled" && pushResult.value.failed > 0);

    store.setStatus(pushFailed ? "error" : failed > 0 ? "error" : "idle");
    store.setLastSyncedAt(new Date().toISOString());

    const pushError = pushResult.status === "fulfilled" ? pushResult.value.lastError : null;
    const pullError = pullResult.status === "rejected" ? String(pullResult.reason) : null;
    store.setLastError(pushError ?? pullError);
  } catch (err) {
    store.setStatus("error");
    store.setLastError(String(err));
  }
}

export function startSyncEngine(tenantId: string): void {
  _tenantId = tenantId;

  if (_intervalId) clearInterval(_intervalId);

  // Run immediately, then on interval
  void runSync();
  _intervalId = setInterval(() => { void runSync(); }, INTERVAL_MS);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
}

export function stopSyncEngine(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
}

export async function triggerSync(): Promise<void> {
  await runSync();
}

function onOnline(): void {
  void runSync();
}

function onOffline(): void {
  useSyncStore.getState().setStatus("offline");
}
