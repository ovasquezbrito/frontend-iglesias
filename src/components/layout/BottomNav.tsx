import { Link, useLocation } from "@tanstack/react-router";
import { Home, CheckSquare, Baby, HeartHandshake, HandCoins } from "lucide-react";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();
  const ministry = useChurchAuthStore((s) => s.ministry);
  const role = useChurchAuthStore((s) => s.role);
  const isAdmin = role === "ADMIN" || role === "EMPRESA";
  const features = ministry?.features;

  const items = [
    { to: "/" as const, label: "Inicio", icon: Home, show: true, accent: "text-indigo-400" },
    {
      to: "/attendance" as const,
      label: "Asistencia",
      icon: CheckSquare,
      show: isAdmin || Boolean(features?.attendance),
      accent: "text-sky-400",
    },
    {
      to: "/kids-checkin" as const,
      label: "Niños",
      icon: Baby,
      show: isAdmin || Boolean(features?.kids_checkin),
      accent: "text-amber-400",
    },
    {
      to: "/consolidation" as const,
      label: "Bautismos",
      icon: HeartHandshake,
      show: isAdmin || Boolean(features?.baptisms),
      accent: "text-rose-400",
    },
    {
      to: "/offerings" as const,
      label: "Ofrendas",
      icon: HandCoins,
      show: isAdmin || Boolean(features?.offerings),
      accent: "text-emerald-400",
    },
  ].filter((item) => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-md mx-auto glass-surface px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around gap-1">
          {items.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center min-h-12 min-w-0 flex-1 rounded-xl px-1 py-1 text-[10px] font-semibold transition-colors",
                  active
                    ? `${item.accent} bg-white/8`
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon className="h-5 w-5 mb-0.5 shrink-0" />
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
