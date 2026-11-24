import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { useOfflineQueueStore } from "@/lib/offline-queue";

export function OfflineBanner() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const queue = useOfflineQueueStore((s) => s.queue);
  const isSyncing = useOfflineQueueStore((s) => s.isSyncing);
  const flush = useOfflineQueueStore((s) => s.flush);

  const handleSync = async () => {
    const res = await flush();
    if (res.synced > 0) {
      await queryClient.invalidateQueries();
      toast.success(`${res.synced} registro(s) sincronizado(s) con KlaroConta`);
    }
    if (res.failed > 0) {
      toast.warning(`${res.failed} registro(s) pendientes de sincronizar`);
    }
  };

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (useOfflineQueueStore.getState().queue.length > 0) {
        void useOfflineQueueStore
          .getState()
          .flush()
          .then((res) => {
            if (res.synced > 0) {
              void queryClient.invalidateQueries();
              toast.success(`Conexión restaurada · ${res.synced} cambio(s) sincronizado(s)`);
            }
          });
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [queryClient]);

  if (isOnline && queue.length === 0) return null;

  return (
    <div
      className={`sticky top-0 z-40 px-3 py-2 text-xs font-medium flex items-center justify-between gap-2 backdrop-blur-md border-b ${
        !isOnline
          ? "bg-amber-950/90 border-amber-500/30 text-amber-200"
          : "bg-indigo-950/90 border-indigo-500/30 text-indigo-200"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline ? (
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        ) : (
          <CloudUpload className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
        )}
        <span className="truncate">
          {!isOnline
            ? `Sin conexión${queue.length > 0 ? ` · ${queue.length} pendiente(s)` : ""}`
            : `${queue.length} registro(s) por sincronizar`}
        </span>
      </div>
      {isOnline && queue.length > 0 && (
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/20 disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      )}
    </div>
  );
}
