import { useState } from "react";
import {
  HandCoins,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import {
  useChurchEvents,
  useCreatePendingOffering,
  useMyChurchOfferings,
} from "@/features/church/hooks/use-church-queries";
import { formatMoney, todayDateString } from "@/lib/utils";
import type {
  ChurchPendingOffering,
  OfferingCurrency,
  OfferingPaymentMethod,
  OfferingType,
} from "@/types/church";
import { ResubmitOfferingModal } from "./ResubmitOfferingModal";

export function OfferingsView() {
  const churchName = useChurchAuthStore((s) => s.churchName);
  const { data: openEvents = [] } = useChurchEvents("OPEN");
  const activeEvent = openEvents[0] || null;

  const { data: offerings = [], isLoading: loadingOfferings } = useMyChurchOfferings();
  const createOfferingMutation = useCreatePendingOffering();

  const [resubmitting, setResubmitting] = useState<ChurchPendingOffering | null>(null);

  // Card 1: General Offering (Anonymous)
  const [genCurrency, setGenCurrency] = useState<OfferingCurrency>("VES");
  const [genMethod, setGenMethod] = useState<OfferingPaymentMethod>("EFECTIVO");
  const [genRef, setGenRef] = useState("");
  const [genAmount, setGenAmount] = useState("");

  // Card 2: Named Tithe / Special Offering
  const [namedType, setNamedType] = useState<OfferingType>("DIEZMO");
  const [donorName, setDonorName] = useState("");
  const [namedCurrency, setNamedCurrency] = useState<OfferingCurrency>("USD");
  const [namedMethod, setNamedMethod] = useState<OfferingPaymentMethod>("ZELLE");
  const [namedRef, setNamedRef] = useState("");
  const [namedAmount, setNamedAmount] = useState("");
  const [namedNotes, setNamedNotes] = useState("");

  const handleSubmitGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(genAmount);
    if (!num || num <= 0) {
      toast.error("Ingresa un monto mayor a cero");
      return;
    }
    if (genMethod !== "EFECTIVO" && !genRef.trim()) {
      toast.error("La referencia bancaria es obligatoria para este método de pago");
      return;
    }

    await createOfferingMutation.mutateAsync({
      event_id: activeEvent?.id,
      offering_type: "OFRENDA_GENERAL",
      currency: genCurrency,
      payment_method: genMethod,
      reference_number: genRef.trim() || undefined,
      amount: num,
      offering_date: todayDateString(),
    });
    setGenAmount("");
    setGenRef("");
  };

  const handleSubmitNamed = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(namedAmount);
    if (!donorName.trim()) {
      toast.error("Ingresa el nombre del donante");
      return;
    }
    if (!num || num <= 0) {
      toast.error("Ingresa un monto mayor a cero");
      return;
    }
    if (namedMethod !== "EFECTIVO" && !namedRef.trim()) {
      toast.error("La referencia bancaria es obligatoria para este método de pago");
      return;
    }

    await createOfferingMutation.mutateAsync({
      event_id: activeEvent?.id,
      offering_type: namedType,
      donor_name: donorName.trim(),
      currency: namedCurrency,
      payment_method: namedMethod,
      reference_number: namedRef.trim() || undefined,
      amount: num,
      offering_date: todayDateString(),
      notes: namedNotes.trim() || undefined,
    });
    setDonorName("");
    setNamedAmount("");
    setNamedRef("");
    setNamedNotes("");
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-5">
      {/* Header + KlaroConta Bridge Indicator */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 max-w-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">Conectado a KlaroConta · {churchName}</span>
        </div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-emerald-400" />
          Ofrendas y Diezmos
        </h1>
        <p className="text-xs text-slate-400">
          Los montos reportados ingresan a la Bandeja de Revisión Contable de KlaroConta.
        </p>
      </div>

      {/* Card 1: General Offering (Anonymous) */}
      <Card className="border-emerald-400/25">
        <CardHeader>
          <CardTitle className="text-emerald-200">Ofrenda General del Culto (Anónima)</CardTitle>
          <CardDescription>Registro rápido del recaudo general sin nombre de donante.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitGeneral} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label>Moneda</Label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950/70 border border-white/10">
                  {(["VES", "USD"] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setGenCurrency(cur)}
                      className={`min-h-9 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        genCurrency === cur
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Método</Label>
                <Select
                  value={genMethod}
                  onValueChange={(v) => setGenMethod(v as OfferingPaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="ZELLE">Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {genMethod !== "EFECTIVO" && (
              <div className="space-y-1">
                <Label htmlFor="gen-ref">Referencia Bancaria *</Label>
                <Input
                  id="gen-ref"
                  value={genRef}
                  onChange={(e) => setGenRef(e.target.value)}
                  placeholder="Nro. de referencia / confirmación"
                  maxLength={100}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="gen-amount">Monto ({genCurrency}) *</Label>
              <Input
                id="gen-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={genAmount}
                onChange={(e) => setGenAmount(e.target.value)}
                placeholder="0.00"
                className="text-2xl font-extrabold h-14 text-emerald-200"
                required
              />
            </div>

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              className="w-full"
              disabled={createOfferingMutation.isPending}
            >
              {createOfferingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar a Revisión
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 2: Named Tithe / Special Offering */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Diezmo / Ofrenda con Nombre</CardTitle>
          <CardDescription>Diezmos, primicias u ofrendas especiales identificadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitNamed} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={namedType} onValueChange={(v) => setNamedType(v as OfferingType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIEZMO">Diezmo</SelectItem>
                    <SelectItem value="PRIMICIA">Primicia</SelectItem>
                    <SelectItem value="OFRENDA_ESPECIAL">Ofrenda Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Moneda</Label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950/70 border border-white/10">
                  {(["VES", "USD"] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setNamedCurrency(cur)}
                      className={`min-h-9 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        namedCurrency === cur
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="named-donor">Nombre del Donante *</Label>
              <Input
                id="named-donor"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Ej. Familia Rodríguez"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label>Método</Label>
                <Select
                  value={namedMethod}
                  onValueChange={(v) => setNamedMethod(v as OfferingPaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="ZELLE">Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="named-amount">Monto ({namedCurrency}) *</Label>
                <Input
                  id="named-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={namedAmount}
                  onChange={(e) => setNamedAmount(e.target.value)}
                  placeholder="0.00"
                  className="font-bold text-base"
                  required
                />
              </div>
            </div>

            {namedMethod !== "EFECTIVO" && (
              <div className="space-y-1">
                <Label htmlFor="named-ref">Referencia Bancaria *</Label>
                <Input
                  id="named-ref"
                  value={namedRef}
                  onChange={(e) => setNamedRef(e.target.value)}
                  placeholder="Nro. de referencia"
                  maxLength={100}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="named-notes">Nota opcional</Label>
              <Textarea
                id="named-notes"
                value={namedNotes}
                onChange={(e) => setNamedNotes(e.target.value)}
                placeholder="Detalle adicional para tesorería..."
              />
            </div>

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              className="w-full"
              disabled={createOfferingMutation.isPending}
            >
              {createOfferingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Registrar y Enviar a Revisión
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bottom Section: My Reported Offerings */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Mis Reportes Enviados ({offerings.length})
        </h2>

        {loadingOfferings ? (
          <Card>
            <CardContent className="p-6 text-center text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-400" />
              Cargando historial...
            </CardContent>
          </Card>
        ) : offerings.length === 0 ? (
          <Card>
            <CardContent className="p-7 text-center space-y-2">
              <FileText className="h-8 w-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">Aún no has enviado reportes</p>
              <p className="text-xs text-slate-400">
                Aquí verás en tiempo real si tesorería aprobó o rechazó cada ofrenda.
              </p>
            </CardContent>
          </Card>
        ) : (
          offerings.map((item) => (
            <Card key={item.id} className="border-white/10">
              <CardContent className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-white">
                      {formatMoney(item.amount, item.currency)}
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      {item.offering_type}
                      {item.donor_name ? ` · ${item.donor_name}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.offering_date} · {item.payment_method}
                      {item.reference_number ? ` · Ref: ${item.reference_number}` : ""}
                    </p>
                  </div>

                  {item.review_status === "PENDING_REVIEW" ? (
                    <Badge variant="amber" className="shrink-0">
                      <Clock className="h-3 w-3" />
                      En Revisión
                    </Badge>
                  ) : item.review_status === "APPROVED" ? (
                    <Badge variant="emerald" className="shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Aprobado
                    </Badge>
                  ) : (
                    <Badge variant="red" className="shrink-0">
                      <XCircle className="h-3 w-3" />
                      Rechazado
                    </Badge>
                  )}
                </div>

                {item.review_status === "REJECTED" && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 space-y-2">
                    <p className="text-xs text-rose-200">
                      <strong className="text-rose-300">Motivo:</strong>{" "}
                      {item.rejection_reason || "Rechazado por contabilidad"}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-rose-400/40 text-rose-200 hover:bg-rose-500/20"
                      onClick={() => setResubmitting(item)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Corregir y Reenviar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {resubmitting && (
        <ResubmitOfferingModal
          key={resubmitting.id}
          offering={resubmitting}
          onClose={() => setResubmitting(null)}
        />
      )}
    </div>
  );
}
