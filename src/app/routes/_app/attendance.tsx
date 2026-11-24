import { createFileRoute } from "@tanstack/react-router";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { FeatureRestrictedCard } from "@/components/layout/FeatureRestrictedCard";
import { AttendanceView } from "@/features/attendance/components/AttendanceView";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const role = useChurchAuthStore((s) => s.role);
  const features = useChurchAuthStore((s) => s.ministry?.features);
  const allowed = role === "ADMIN" || role === "EMPRESA" || Boolean(features?.attendance);

  if (!allowed) return <FeatureRestrictedCard moduleName="Asistencia y Eventos" />;
  return <AttendanceView />;
}
