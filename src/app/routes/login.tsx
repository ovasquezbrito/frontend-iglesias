import { createFileRoute, redirect } from "@tanstack/react-router";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { LoginView } from "@/features/auth/components/LoginView";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (useChurchAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginView,
});
