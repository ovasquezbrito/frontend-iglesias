import { createFileRoute } from "@tanstack/react-router";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { FeatureRestrictedCard } from "@/components/layout/FeatureRestrictedCard";
import { ConsolidationView } from "@/features/consolidation/components/ConsolidationView";

export const Route = createFileRoute("/_app/consolidation")({
  component: ConsolidationPage,
});

function ConsolidationPage() {
  const role = useChurchAuthStore((s) => s.role);
  const features = useChurchAuthStore((s) => s.ministry?.features);
  const allowed = role === "ADMIN" || role === "EMPRESA" || Boolean(features?.baptisms);

  if (!allowed) return <FeatureRestrictedCard moduleName="Consolidación y Bautismos" />;
  return <ConsolidationView />;
}
