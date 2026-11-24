import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResubmitOffering } from "@/features/church/hooks/use-church-queries";
import type {
  ChurchPendingOffering,
  OfferingCurrency,
  OfferingPaymentMethod,
  OfferingType,
} from "@/types/church";

interface ResubmitOfferingModalProps {
  offering: ChurchPendingOffering;
  onClose: () => void;
}

export function ResubmitOfferingModal({ offering, onClose }: ResubmitOfferingModalProps) {
  const resubmitMutation = useResubmitOffering();

  const [offeringType, setOfferingType] = useState<OfferingType>(
    (offering.offering_type as OfferingType) || "OFRENDA_GENERAL"
  );
  const [donorName, setDonorName] = useState(offering.donor_name || "");
  const [currency, setCurrency] = useState<OfferingCurrency>(
    (offering.currency as OfferingCurrency) || "VES"
  );
  const [paymentMethod, setPaymentMethod] = useState<OfferingPaymentMethod>(
    (offering.payment_method as OfferingPaymentMethod) || "EFECTIVO"
  );
  const [referenceNumber, setReferenceNumber] = useState(offering.reference_number || "");
  const [amount, setAmount] = useState(String(offering.amount || ""));
  const [offeringDate, setOfferingDate] = useState(offering.offering_date || "");
  const [notes, setNotes] = useState(offering.notes || "");

  const needsReference = paymentMethod !== "EFECTIVO";
  const parsedAmount = Number(amount);
  const canSubmit =
    parsedAmount > 0 &&
    Boolean(offeringDate) &&
    (!needsReference || Boolean(referenceNumber.trim())) &&
    !resubmitMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    await resubmitMutation.mutateAsync({
      id: offering.id,
      branch_id: offering.branch_id || undefined,
      event_id: offering.event_id || undefined,
      offering_type: offeringType,
      donor_name: donorName.trim() || undefined,
      currency,
      payment_method: paymentMethod,
      reference_number: referenceNumber.trim() || undefined,
      amount: parsedAmount,
      offering_date: offeringDate,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-400" />
            Corregir y Reenviar Ofrenda
          </DialogTitle>
          <DialogDescription>
            Corrige lo indicado por contabilidad y vuelve a enviarla a la Bandeja de Revisión.
          </DialogDescription>
        </DialogHeader>

        {offering.rejection_reason && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200 mb-3">
            <strong className="block text-rose-300 mb-0.5">Motivo del rechazo:</strong>
            {offering.rejection_reason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={offeringType} onValueChange={(v) => setOfferingType(v as OfferingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFRENDA_GENERAL">Ofrenda General</SelectItem>
                  <SelectItem value="DIEZMO">Diezmo</SelectItem>
                  <SelectItem value="PRIMICIA">Primicia</SelectItem>
                  <SelectItem value="OFRENDA_ESPECIAL">Ofrenda Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as OfferingCurrency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VES">VES (Bs.)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label>Método de Pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as OfferingPaymentMethod)}
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
              <Label htmlFor="resub-date">Fecha</Label>
              <Input
                id="resub-date"
                type="date"
                value={offeringDate}
                onChange={(e) => setOfferingDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="resub-amount">Monto ({currency}) *</Label>
            <Input
              id="resub-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="resub-ref">
              Referencia {needsReference ? "*" : "(opcional)"}
            </Label>
            <Input
              id="resub-ref"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              maxLength={100}
              placeholder="Número de referencia bancaria"
              required={needsReference}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="resub-donor">Donante (opcional)</Label>
            <Input
              id="resub-donor"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Nombre del donante"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="resub-notes">Notas</Label>
            <Textarea
              id="resub-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observación para tesorería..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="emerald" disabled={!canSubmit}>
              {resubmitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reenviar a KlaroConta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
