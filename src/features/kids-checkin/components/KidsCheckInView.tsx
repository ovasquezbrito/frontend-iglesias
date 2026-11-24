import { useMemo, useState } from "react";
import {
  Baby,
  Plus,
  Search,
  ShieldCheck,
  MessageCircle,
  LogOut as CheckOutIcon,
  AlertTriangle,
  Loader2,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import {
  useCheckInAttendance,
  useCheckOutAttendance,
  useChurchAttendance,
  useChurchEvents,
  useChurchPeople,
  useCreateChurchEvent,
  useCreateChurchPerson,
} from "@/features/church/hooks/use-church-queries";
import {
  buildWhatsAppUrl,
  generateKidsSecurityCode,
  parseKidMetadata,
} from "@/lib/utils";
import type { ChurchAttendance, ChurchPerson } from "@/types/church";

interface TicketData {
  childName: string;
  securityCode: string;
  guardianName: string;
  guardianPhone: string;
  eventTitle: string;
}

export function KidsCheckInView() {
  const churchName = useChurchAuthStore((s) => s.churchName);
  const activeBranch = useChurchAuthStore((s) => s.activeBranch);

  const [tab, setTab] = useState<"checkin" | "inside">("checkin");
  const [search, setSearch] = useState("");

  const { data: openEvents = [] } = useChurchEvents("OPEN");
  const currentEvent = openEvents[0] || null;
  const { data: attendance = [] } = useChurchAttendance(currentEvent?.id);

  const { data: kids = [], isLoading: loadingKids } = useChurchPeople({
    search: search.trim() || undefined,
    branch_id: activeBranch?.id || undefined,
    person_type: "CHILD",
    limit: 150,
  });

  const kidsById = useMemo(() => {
    const m = new Map<string, ChurchPerson>();
    for (const k of kids) m.set(k.id, k);
    return m;
  }, [kids]);

  const insideKids = useMemo(
    () => attendance.filter((a) => !a.check_out_at && Boolean(a.security_code)),
    [attendance]
  );

  const existingCodes = useMemo(
    () => new Set(attendance.map((a) => a.security_code).filter(Boolean)),
    [attendance]
  );

  const checkedInPersonIds = useMemo(
    () => new Set(attendance.map((a) => a.person_id)),
    [attendance]
  );

  const checkInMutation = useCheckInAttendance();
  const checkOutMutation = useCheckOutAttendance();
  const createPersonMutation = useCreateChurchPerson();
  const createEventMutation = useCreateChurchEvent();

  // Ticket modal
  const [ticket, setTicket] = useState<TicketData | null>(null);

  // Check-out verification modal
  const [checkingOut, setCheckingOut] = useState<ChurchAttendance | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  // New Kid Modal
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [kidName, setKidName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [allergies, setAllergies] = useState("");
  const [checkInOnRegister, setCheckInOnRegister] = useState(true);

  const ensureEvent = async () => {
    if (currentEvent) return currentEvent;
    return createEventMutation.mutateAsync({
      title: "Escuela de Niños",
      event_date: new Date().toISOString(),
    });
  };

  const handleKidCheckIn = async (kid: ChurchPerson) => {
    const ev = await ensureEvent();
    const meta = parseKidMetadata(kid.metadata_json);
    const code = generateKidsSecurityCode(existingCodes);

    try {
      const created = await checkInMutation.mutateAsync({
        event_id: ev.id,
        person_id: kid.id,
        person_name: kid.full_name,
        person_type: "CHILD",
        security_code: code,
      });

      setTicket({
        childName: kid.full_name,
        securityCode: created.security_code || code,
        guardianName: meta.guardian_name || "Representante",
        guardianPhone: meta.guardian_phone || kid.phone || "",
        eventTitle: ev.title,
      });
    } catch {
      // Handled by hook toast
    }
  };

  const handleCreateKid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kidName.trim()) return;

    const metadata = JSON.stringify({
      guardian_name: guardianName.trim(),
      guardian_phone: guardianPhone.trim(),
      allergies: allergies.trim(),
    });

    const created = await createPersonMutation.mutateAsync({
      branch_id: activeBranch?.id || undefined,
      full_name: kidName.trim(),
      phone: guardianPhone.trim() || undefined,
      person_type: "CHILD",
      metadata_json: metadata,
    });

    setKidModalOpen(false);
    setKidName("");
    setGuardianName("");
    setGuardianPhone("");
    setAllergies("");

    if (checkInOnRegister) {
      await handleKidCheckIn(created);
    } else {
      toast.success(`${created.full_name} registrado(a)`);
    }
  };

  const handleConfirmCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkingOut || !currentEvent) return;
    if (verifyCode.trim().toUpperCase() !== checkingOut.security_code.toUpperCase()) {
      toast.error("El código de seguridad no coincide. Verifica el ticket del representante.");
      return;
    }
    await checkOutMutation.mutateAsync({ id: checkingOut.id, eventId: currentEvent.id });
    setCheckingOut(null);
    setVerifyCode("");
  };

  const whatsAppTicketUrl = ticket?.guardianPhone
    ? buildWhatsAppUrl(
        ticket.guardianPhone,
        `Hola ${ticket.guardianName}, confirmamos el ingreso seguro de *${ticket.childName}* en *${ticket.eventTitle}* (${churchName}).\n\n🔐 *Código de retiro:* *${ticket.securityCode}*\n\nPresenta este código al momento de retirar al niño.`
      )
    : "";

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Baby className="h-5 w-5 text-amber-400" />
            Check-in de Niños
          </h1>
          <p className="text-xs text-slate-400">
            Control seguro con código K-XXX y ticket WhatsApp
          </p>
        </div>
        <Badge variant="amber">{insideKids.length} adentro</Badge>
      </div>

      {!currentEvent && (
        <Card className="border-amber-400/30 bg-amber-950/20">
          <CardContent className="p-3.5 flex items-center justify-between gap-2">
            <span className="text-xs text-amber-200">No hay clase/culto abierto hoy.</span>
            <Button
              size="sm"
              variant="amber"
              onClick={() => void ensureEvent()}
              disabled={createEventMutation.isPending}
            >
              <CalendarPlus className="h-4 w-4" />
              Abrir Clase
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-white/10">
        <button
          type="button"
          onClick={() => setTab("checkin")}
          className={`min-h-11 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            tab === "checkin"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Entrada (Check-in)
        </button>
        <button
          type="button"
          onClick={() => setTab("inside")}
          className={`min-h-11 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            tab === "inside"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Adentro ahora ({insideKids.length})
        </button>
      </div>

      {tab === "checkin" ? (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar niño..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="amber" size="icon" onClick={() => setKidModalOpen(true)} title="Registrar niño">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-2.5">
            {loadingKids ? (
              <Card>
                <CardContent className="p-8 text-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                  Cargando niños...
                </CardContent>
              </Card>
            ) : kids.length === 0 ? (
              <Card>
                <CardContent className="p-7 text-center space-y-3">
                  <Baby className="h-8 w-8 text-amber-400/70 mx-auto" />
                  <p className="text-sm font-semibold text-white">Sin niños registrados</p>
                  <p className="text-xs text-slate-400">
                    Registra un niño con los datos de su representante y alergias.
                  </p>
                  <Button variant="amber" size="sm" onClick={() => setKidModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Registrar Niño
                  </Button>
                </CardContent>
              </Card>
            ) : (
              kids.map((kid) => {
                const meta = parseKidMetadata(kid.metadata_json);
                const alreadyIn = checkedInPersonIds.has(kid.id);
                return (
                  <Card key={kid.id} className="border-amber-400/15">
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-bold text-white truncate">{kid.full_name}</p>
                        {meta.guardian_name && (
                          <p className="text-xs text-slate-400 truncate">
                            Rep.: {meta.guardian_name} {meta.guardian_phone ? `· ${meta.guardian_phone}` : ""}
                          </p>
                        )}
                        {meta.allergies && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-rose-300 bg-rose-500/15 border border-rose-400/30 rounded-lg px-2 py-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{meta.allergies}</span>
                          </div>
                        )}
                      </div>
                      {alreadyIn ? (
                        <Badge variant="emerald" className="shrink-0">Registrado</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="amber"
                          onClick={() => void handleKidCheckIn(kid)}
                          disabled={checkInMutation.isPending}
                          className="shrink-0"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Check-in
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2.5">
          {insideKids.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <ShieldCheck className="h-8 w-8 text-emerald-400/70 mx-auto" />
                <p className="text-sm font-semibold text-white">No hay niños pendientes de entrega</p>
                <p className="text-xs text-slate-400">
                  Todos los niños del evento ya fueron retirados o aún no han hecho check-in.
                </p>
              </CardContent>
            </Card>
          ) : (
            insideKids.map((att) => {
              const kid = kidsById.get(att.person_id);
              const meta = parseKidMetadata(kid?.metadata_json);
              return (
                <Card key={att.id} className="border-amber-400/25">
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{att.person_name}</p>
                        {meta.guardian_name && (
                          <p className="text-xs text-slate-400 truncate">Rep.: {meta.guardian_name}</p>
                        )}
                      </div>
                      <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 shrink-0">
                        {att.security_code}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-400/40 text-amber-200 hover:bg-amber-500/15"
                      onClick={() => {
                        setCheckingOut(att);
                        setVerifyCode("");
                      }}
                    >
                      <CheckOutIcon className="h-4 w-4" />
                      Entregar Niño (Check-out)
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* New Kid Dialog */}
      <Dialog open={kidModalOpen} onOpenChange={setKidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Niño Nuevo</DialogTitle>
            <DialogDescription>
              Guarda los datos del representante y alertas médicas para un check-in seguro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKid} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="kid-name">Nombre del Niño *</Label>
              <Input
                id="kid-name"
                value={kidName}
                onChange={(e) => setKidName(e.target.value)}
                placeholder="Ej. Santiago Morales"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kid-guardian">Nombre del Representante *</Label>
              <Input
                id="kid-guardian"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Ej. Laura Morales"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kid-phone">Teléfono del Representante (WhatsApp)</Label>
              <Input
                id="kid-phone"
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="Ej. 0412-5551234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kid-allergies">Alergias / Notas Médicas</Label>
              <Textarea
                id="kid-allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ej. Alérgico al maní, usa inhalador..."
              />
            </div>
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={checkInOnRegister}
                onChange={(e) => setCheckInOnRegister(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
              />
              Generar ticket de Check-in inmediatamente
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setKidModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="amber"
                disabled={createPersonMutation.isPending || !kidName.trim()}
              >
                {createPersonMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar Niño
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Modal with WhatsApp Button */}
      <Dialog open={Boolean(ticket)} onOpenChange={(open) => !open && setTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Ticket de Seguridad</DialogTitle>
            <DialogDescription className="text-center">
              Entrega o envía este código al representante para el retiro seguro.
            </DialogDescription>
          </DialogHeader>
          {ticket && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-500/10 py-6 px-4">
                <p className="text-xs uppercase tracking-widest text-amber-200">Código de Retiro</p>
                <p className="text-5xl font-black font-mono tracking-wider text-amber-300 mt-1">
                  {ticket.securityCode}
                </p>
                <p className="text-sm font-bold text-white mt-3">{ticket.childName}</p>
                <p className="text-xs text-slate-400">Rep.: {ticket.guardianName}</p>
              </div>

              {whatsAppTicketUrl ? (
                <Button asChild variant="emerald" size="lg" className="w-full">
                  <a href={whatsAppTicketUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5" />
                    Enviar ticket por WhatsApp
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-slate-400">
                  No hay teléfono registrado para enviar el ticket por WhatsApp.
                </p>
              )}

              <Button variant="outline" className="w-full" onClick={() => setTicket(null)}>
                Listo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-out Verification Modal */}
      <Dialog open={Boolean(checkingOut)} onOpenChange={(open) => !open && setCheckingOut(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar Código de Retiro</DialogTitle>
            <DialogDescription>
              Confirma el código presentado por el representante de{" "}
              <strong className="text-white">{checkingOut?.person_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmCheckOut} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-code">Código de Seguridad (ej. K-482)</Label>
              <Input
                id="checkout-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                placeholder="K-XXX"
                className="uppercase font-mono text-center text-lg tracking-widest"
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCheckingOut(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="emerald"
                disabled={checkOutMutation.isPending || !verifyCode.trim()}
              >
                {checkOutMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Entrega
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
