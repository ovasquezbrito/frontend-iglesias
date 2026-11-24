import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Church,
  LogOut,
  CheckSquare,
  Baby,
  HeartHandshake,
  HandCoins,
  Plus,
  CalendarDays,
  Loader2,
  MapPin,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useChurchAttendance,
  useChurchEvents,
  useCreateChurchEvent,
  useMyChurchOfferings,
} from "@/features/church/hooks/use-church-queries";
import { InstallAppBanner } from "@/features/auth/components/InstallAppBanner";

export function DashboardView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    churchName,
    volunteerName,
    role,
    ministry,
    activeBranch,
    assignedBranchId,
    branches,
    ministries,
    setActiveBranch,
    setActiveMinistry,
    logout,
  } = useChurchAuthStore();

  const isAdmin = role === "ADMIN" || role === "EMPRESA";
  const features = ministry?.features;

  const { data: openEvents = [] } = useChurchEvents("OPEN");
  const activeEvent = useMemo(() => openEvents[0] || null, [openEvents]);
  const { data: attendanceList = [] } = useChurchAttendance(activeEvent?.id);
  const { data: myOfferings = [] } = useMyChurchOfferings();

  const createEventMutation = useCreateChurchEvent();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("Culto de Hoy");

  const pendingOfferingsCount = useMemo(
    () => myOfferings.filter((o) => o.review_status === "PENDING_REVIEW").length,
    [myOfferings]
  );

  const todayLabel = useMemo(() => {
    const label = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, []);

  const handleLogout = async () => {
    logout();
    queryClient.clear();
    await navigate({ to: "/login" });
  };

  const handleQuickCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    await createEventMutation.mutateAsync({
      title: eventTitle.trim(),
      event_date: new Date().toISOString(),
    });
    setEventDialogOpen(false);
  };

  const canSwitchBranch = !assignedBranchId && branches.length > 1;

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Church className="h-4 w-4 text-emerald-300" />
            </div>
            <h1 className="text-base font-bold text-white truncate">{churchName || "KlaroIglesia"}</h1>
          </div>
          <p className="text-sm text-slate-300">
            Hola, <span className="font-semibold text-white">{volunteerName}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {ministry && <Badge variant="default">{ministry.name}</Badge>}
            {activeBranch && <Badge variant="slate">{activeBranch.name}</Badge>}
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="shrink-0"
        >
          <LogOut className="h-4 w-4 text-rose-400" />
        </Button>
      </header>

      {/* Admin / Multi-branch context switchers */}
      {(isAdmin || canSwitchBranch) && (
        <div className="glass-card rounded-2xl p-3 grid grid-cols-1 gap-2.5">
          {isAdmin && ministries.length > 0 && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Ministerio activo
              </Label>
              <Select
                value={ministry?.id || ""}
                onValueChange={(id) => {
                  const found = ministries.find((m) => m.id === id);
                  if (found) {
                    setActiveMinistry(found);
                    void queryClient.invalidateQueries({ queryKey: ["church-events"] });
                    void queryClient.invalidateQueries({ queryKey: ["church-offerings-mine"] });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ministerio" />
                </SelectTrigger>
                <SelectContent>
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {canSwitchBranch && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                Sede activa
              </Label>
              <Select
                value={activeBranch?.id || "ALL"}
                onValueChange={(id) => {
                  if (id === "ALL") {
                    setActiveBranch(null);
                  } else {
                    const found = branches.find((b) => b.id === id);
                    if (found) setActiveBranch({ id: found.id, name: found.name });
                  }
                  void queryClient.invalidateQueries({ queryKey: ["church-events"] });
                  void queryClient.invalidateQueries({ queryKey: ["church-people"] });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las sedes</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Summary Card of the Day */}
      <Card className="bg-gradient-to-br from-indigo-950/70 via-slate-900/75 to-slate-900/80 border-indigo-400/20">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-300">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{todayLabel}</span>
            </div>
            {activeEvent ? (
              <>
                <h2 className="text-base font-bold text-white truncate">{activeEvent.title}</h2>
                <p className="text-xs text-emerald-300 font-medium">● Evento abierto en curso</p>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-white">Sin culto activo hoy</h2>
                {(isAdmin || features?.attendance) && (
                  <Button
                    size="sm"
                    onClick={() => setEventDialogOpen(true)}
                    className="mt-1"
                    disabled={!ministry}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Iniciar Culto / Reunión
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Circular attendance indicator */}
          <div className="h-18 w-18 rounded-full border-2 border-indigo-400/50 bg-indigo-500/15 flex flex-col items-center justify-center shrink-0 shadow-inner">
            <span className="text-xl font-extrabold text-white leading-none">
              {attendanceList.length}
            </span>
            <span className="text-[10px] text-indigo-200 font-medium mt-0.5">Hoy</span>
          </div>
        </CardContent>
      </Card>

      <InstallAppBanner />

      {/* Conditional Modules Grid */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Módulos de tu Ministerio
        </h2>

        {!ministry ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-slate-400">
              No hay ministerios activos configurados en KlaroConta. Crea al menos un ministerio en{" "}
              <strong className="text-white">Sedes y Ministerios</strong>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {(isAdmin || features?.attendance) && (
              <Link to="/attendance" className="block group">
                <Card className="border-sky-400/20 hover:border-sky-400/50 transition-all group-active:scale-[0.99]">
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
                      <CheckSquare className="h-6 w-6 text-sky-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white">Asistencia y Eventos</h3>
                      <p className="text-xs text-slate-400">
                        Marcar asistencia en 1 toque y registrar nuevos ingresos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {(isAdmin || features?.kids_checkin) && (
              <Link to="/kids-checkin" className="block group">
                <Card className="border-amber-400/20 hover:border-amber-400/50 transition-all group-active:scale-[0.99]">
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <Baby className="h-6 w-6 text-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white">Check-in de Niños</h3>
                      <p className="text-xs text-slate-400">
                        Entrada/salida segura con código K-XXX y ticket WhatsApp
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {(isAdmin || features?.baptisms) && (
              <Link to="/consolidation" className="block group">
                <Card className="border-rose-400/20 hover:border-rose-400/50 transition-all group-active:scale-[0.99]">
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
                      <HeartHandshake className="h-6 w-6 text-rose-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white">Consolidación y Bautismos</h3>
                      <p className="text-xs text-slate-400">
                        Seguimiento pastoral por WhatsApp y control de bautismos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {(isAdmin || features?.offerings) && (
              <Link to="/offerings" className="block group">
                <Card className="border-emerald-400/25 hover:border-emerald-400/60 transition-all group-active:scale-[0.99]">
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                      <HandCoins className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white">Ofrendas y Diezmos</h3>
                        {pendingOfferingsCount > 0 && (
                          <Badge variant="amber">{pendingOfferingsCount} en revisión</Badge>
                        )}
                      </div>
                      <p className="text-xs text-emerald-300/90 font-medium">
                        🟢 Conectado a KlaroConta
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Quick Start Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Culto / Reunión de Hoy</DialogTitle>
            <DialogDescription>
              Se creará un evento abierto en {ministry?.name} para registrar asistencia.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickCreateEvent} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quick-event-title">Título del Culto / Reunión</Label>
              <Input
                id="quick-event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Ej. Culto Dominical"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending || !eventTitle.trim()}>
                {createEventMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Iniciar Evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
