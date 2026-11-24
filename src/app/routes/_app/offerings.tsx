import { createFileRoute } from "@tanstack/react-router";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { FeatureRestrictedCard } from "@/components/layout/FeatureRestrictedCard";
import { OfferingsView } from "@/features/offerings/components/OfferingsView";

export const Route = createFileRoute("/_app/offerings")({
  component: OfferingsPage,
});

function OfferingsPage() {
  const role = useChurchAuthStore((s) => s.role);
  const features = useChurchAuthStore((s) => s.ministry?.features);
  const allowed = role === "ADMIN" || role === "EMPRESA" || Boolean(features?.offerings);

  if (!allowed) return <FeatureRestrictedCard moduleName="Ofrendas y Diezmos" />;
  return <OfferingsView />;
}
