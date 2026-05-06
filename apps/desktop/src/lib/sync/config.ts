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

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (_client) return _client;
  const config = await getSyncConfig();
  if (!config) return null;
  _client = createClient(config.supabaseUrl, config.supabaseKey);
  return _client;
}
