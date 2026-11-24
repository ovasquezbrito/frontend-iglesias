import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FeatureRestrictedCard({ moduleName }: { moduleName: string }) {
  return (
    <div className="p-4 pt-10">
      <Card className="border-rose-500/30">
        <CardContent className="p-6 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </div>
          <h2 className="text-base font-bold text-white">Módulo no habilitado</h2>
          <p className="text-xs text-slate-400">
            Tu ministerio no tiene activada la capacidad de <strong>{moduleName}</strong> en KlaroConta.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Volver al Inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
