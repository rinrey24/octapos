import { pushPendingItems } from "./push";
import { pullRemoteChanges } from "./pull";
import { getPendingCount } from "./queue";
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

    const pushFailed = pushResult.status === "rejected" || (pushResult.status === "fulfilled" && pushResult.value.failed > 0);

    store.setStatus(pushFailed ? "error" : "idle");
    store.setLastSyncedAt(new Date().toISOString());
    store.setPendingCount(await getPendingCount());

    if (pullResult.status === "rejected") {
      store.setLastError("Pull failed: " + String(pullResult.reason));
    } else {
      store.setLastError(null);
    }
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
