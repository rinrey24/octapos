import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getSyncConfig, setSyncConfig, clearSyncConfig } from "@/lib/sync/config";
import { triggerSync } from "@/lib/sync/engine";
import { resetFailedItems } from "@/lib/sync/queue";
import { fullResync } from "@/lib/sync/fullResync";
import { useSyncStore } from "@/stores/sync.store";
import { useAuthStore } from "@/stores/auth.store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SyncSettingsModal({ open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
  const { failedCount, lastError } = useSyncStore();
  const { session } = useAuthStore();

  useEffect(() => {
    if (!open) return;
    void getSyncConfig().then((cfg) => {
      if (cfg) { setUrl(cfg.supabaseUrl); setKey(cfg.supabaseKey); }
    });
    setMessage(null);
  }, [open]);

  async function handleSave() {
    if (!url.trim() || !key.trim()) {
      setMessage({ text: "URL dan API key wajib diisi.", type: "error" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await setSyncConfig({ supabaseUrl: url.trim(), supabaseKey: key.trim() });
      await triggerSync();
      setMessage({ text: "Konfigurasi disimpan. Sinkronisasi dimulai.", type: "success" });
    } catch {
      setMessage({ text: "Gagal menyimpan konfigurasi.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRetryFailed() {
    setRetrying(true);
    setMessage(null);
    try {
      const count = await resetFailedItems();
      await triggerSync();
      setMessage({ text: `${count} item direset dan dicoba ulang.`, type: "info" });
    } catch {
      setMessage({ text: "Gagal mereset antrean.", type: "error" });
    } finally {
      setRetrying(false);
    }
  }

  async function handleFullResync() {
    if (!session) return;
    setResyncing(true);
    setMessage(null);
    try {
      const count = await fullResync(session.tenant.id, session.outlet.id);
      await triggerSync();
      setMessage({ text: `${count} item di-enqueue ulang dan sinkronisasi dimulai.`, type: "success" });
    } catch (e) {
      setMessage({ text: `Gagal: ${String(e)}`, type: "error" });
    } finally {
      setResyncing(false);
    }
  }

  async function handleClear() {
    await clearSyncConfig();
    setUrl(""); setKey("");
    setMessage({ text: "Konfigurasi dihapus.", type: "info" });
  }

  const msgColor = message?.type === "error" ? "text-red-600" : message?.type === "success" ? "text-green-600" : "text-indigo-600";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 z-50 w-[480px]">
          <Dialog.Title className="text-lg font-semibold mb-4">Pengaturan Sinkronisasi Cloud</Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supabase Project URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Role Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJ..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supabase Dashboard → Settings → <strong>API Keys</strong> →
                tab <strong>"Legacy anon, service_role API keys"</strong> →
                copy key <strong>service_role</strong> (diawali <code className="bg-gray-100 px-1 rounded">eyJ</code>).
              </p>
            </div>

            {/* Error from last sync */}
            {lastError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-mono break-all">
                Error terakhir: {lastError}
              </div>
            )}

            {/* Failed queue warning */}
            {failedCount > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-amber-800">
                  <strong>{failedCount}</strong> item gagal sync dan terhenti.
                  Pastikan skema Supabase sudah diapply, lalu klik retry.
                </p>
                <button
                  onClick={() => { void handleRetryFailed(); }}
                  disabled={retrying}
                  className="shrink-0 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {retrying ? "Retrying..." : "Retry Gagal"}
                </button>
              </div>
            )}

            {/* Full resync — use when cloud DB is empty */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-600">
                Cloud kosong atau data tidak lengkap? Kirim ulang <strong>semua data lokal</strong> ke Supabase.
              </p>
              <button
                onClick={() => { void handleFullResync(); }}
                disabled={resyncing}
                className="shrink-0 px-3 py-1.5 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                {resyncing ? "Mengirim..." : "Full Resync"}
              </button>
            </div>

            {message && (
              <p className={`text-sm ${msgColor}`}>{message.text}</p>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => { void handleClear(); }}
                className="text-sm text-red-500 hover:underline"
              >
                Hapus konfigurasi
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => { void handleSave(); }}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan & Sync"}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
