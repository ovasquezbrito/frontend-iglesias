import { createFileRoute } from "@tanstack/react-router";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { FeatureRestrictedCard } from "@/components/layout/FeatureRestrictedCard";
import { KidsCheckInView } from "@/features/kids-checkin/components/KidsCheckInView";

export const Route = createFileRoute("/_app/kids-checkin")({
  component: KidsCheckInPage,
});

function KidsCheckInPage() {
  const role = useChurchAuthStore((s) => s.role);
  const features = useChurchAuthStore((s) => s.ministry?.features);
  const allowed = role === "ADMIN" || role === "EMPRESA" || Boolean(features?.kids_checkin);

  if (!allowed) return <FeatureRestrictedCard moduleName="Check-in de Niños" />;
  return <KidsCheckInView />;
}
