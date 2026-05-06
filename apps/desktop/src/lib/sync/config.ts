import { Store } from "@tauri-apps/plugin-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STORE_KEY = "sync_config.json";

export interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

let _store: Store | null = null;
let _client: SupabaseClient | null = null;

async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await Store.load(STORE_KEY);
  }
  return _store;
}

export async function getSyncConfig(): Promise<SyncConfig | null> {
  const store = await getStore();
  const url = await store.get<string>("supabase_url");
  const key = await store.get<string>("supabase_key");
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

export async function setSyncConfig(config: SyncConfig): Promise<void> {
  const store = await getStore();
  await store.set("supabase_url", config.supabaseUrl);
  await store.set("supabase_key", config.supabaseKey);
  await store.save();
  _client = null; // reset client so it gets recreated
}

export async function clearSyncConfig(): Promise<void> {
  const store = await getStore();
  await store.delete("supabase_url");
  await store.delete("supabase_key");
  await store.save();
  _client = null;
}

// Custom fetch that strips browser-identifying headers so Supabase API
// accepts the service_role/secret key from inside Tauri WebView.
function desktopFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.delete("Origin");
  headers.delete("Referer");
  headers.set("User-Agent", "OctaPOS-Desktop/1.0");
  return fetch(input, { ...init, headers });
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (_client) return _client;
  const config = await getSyncConfig();
  if (!config) return null;
  _client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { fetch: desktopFetch },
  });
  return _client;
}
