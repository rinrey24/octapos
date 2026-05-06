import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getSyncConfig, setSyncConfig, clearSyncConfig } from "@/lib/sync/config";
import { triggerSync } from "@/lib/sync/engine";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SyncSettingsModal({ open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void getSyncConfig().then((cfg) => {
      if (cfg) {
        setUrl(cfg.supabaseUrl);
        setKey(cfg.supabaseKey);
      }
    });
  }, [open]);

  async function handleSave() {
    if (!url.trim() || !key.trim()) {
      setMessage("URL dan API key wajib diisi.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await setSyncConfig({ supabaseUrl: url.trim(), supabaseKey: key.trim() });
      await triggerSync();
      setMessage("Konfigurasi disimpan. Sinkronisasi dimulai.");
    } catch {
      setMessage("Gagal menyimpan konfigurasi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    await clearSyncConfig();
    setUrl("");
    setKey("");
    setMessage("Konfigurasi dihapus.");
  }

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
                Gunakan service_role key dari Settings → API di dashboard Supabase Anda.
              </p>
            </div>

            {message && (
              <p className="text-sm text-indigo-600">{message}</p>
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
