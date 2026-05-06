import { Cloud, CloudOff, CloudLightning, Loader2, Settings } from "lucide-react";
import { useSyncStore } from "@/stores/sync.store";
import { triggerSync } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

interface Props {
  onSettings: () => void;
}

export default function SyncIndicator({ onSettings }: Props) {
  const { status, pendingCount, lastSyncedAt } = useSyncStore();

  const icon = {
    idle: <Cloud className="w-5 h-5 text-green-500" />,
    syncing: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
    error: <CloudLightning className="w-5 h-5 text-yellow-500" />,
    offline: <CloudOff className="w-5 h-5 text-gray-400" />,
    unconfigured: <Cloud className="w-5 h-5 text-gray-400" />,
  }[status];

  const label = {
    idle: lastSyncedAt ? `Tersinkron` : "Belum sync",
    syncing: "Menyinkron...",
    error: "Gagal sync",
    offline: "Offline",
    unconfigured: "Belum dikonfigurasi",
  }[status];

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { void triggerSync(); }}
        title={label}
        className={cn(
          "relative flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
          "hover:bg-white/10 transition-colors"
        )}
      >
        {icon}
        <span className="text-white/80 text-xs hidden sm:inline">{label}</span>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>
      <button
        onClick={onSettings}
        title="Pengaturan sinkronisasi"
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
      >
        <Settings className="w-4 h-4 text-white/60" />
      </button>
    </div>
  );
}
