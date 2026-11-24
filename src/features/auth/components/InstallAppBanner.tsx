import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!deferredPrompt || installed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-3 flex items-center justify-between gap-3 border-indigo-400/25 bg-indigo-950/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
          <Smartphone className="h-4 w-4 text-indigo-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">Instalar KlaroIglesia</p>
          <p className="text-[11px] text-slate-400 truncate">Úsala como app nativa en tu teléfono</p>
        </div>
      </div>
      <Button size="sm" onClick={handleInstall} className="shrink-0">
        <Download className="h-3.5 w-3.5" />
        Instalar
      </Button>
    </div>
  );
}
