import { useEffect } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { authService } from "@/features/auth/services/auth.service";
import { churchService } from "@/features/church/services/church.service";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (!useChurchAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppShellLayout,
});

function AppShellLayout() {
  const role = useChurchAuthStore((s) => s.role);
  const hydrateContext = useChurchAuthStore((s) => s.hydrateContext);
  const setAdminCatalogs = useChurchAuthStore((s) => s.setAdminCatalogs);

  useEffect(() => {
    if (!navigator.onLine) return;
    if (role === "CHURCH_MINISTRY") {
      void authService
        .getContext()
        .then((ctx) => hydrateContext(ctx))
        .catch(() => {
          // Non-fatal while offline/reconnecting
        });
    } else if (role === "ADMIN" || role === "EMPRESA") {
      void Promise.all([churchService.listBranches(), churchService.listMinistries()])
        .then(([branches, ministries]) => setAdminCatalogs(branches, ministries))
        .catch(() => {
          // Non-fatal while offline/reconnecting
        });
    }
  }, [role, hydrateContext, setAdminCatalogs]);

  return (
    <div className="min-h-dvh w-full bg-[#090d16] text-slate-100 relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-dvh flex flex-col">
        <OfflineBanner />
        <main className="flex-1 pb-20">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
