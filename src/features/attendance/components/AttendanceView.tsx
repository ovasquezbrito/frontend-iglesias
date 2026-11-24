import { useMemo, useState } from "react";
import {
  Check,
  Plus,
  Search,
  Users,
  CalendarPlus,
  Loader2,
  Lock,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  useCheckInAttendance,
  useChurchAttendance,
  useChurchEvents,
  useChurchPeople,
  useCreateChurchEvent,
  useCreateChurchPerson,
  useUncheckAttendance,
  useUpdateEventStatus,
} from "@/features/church/hooks/use-church-queries";
import type { ChurchPerson, PersonType } from "@/types/church";

const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  MEMBER: "Miembro",
  VISITOR: "Visitante",
  CHILD: "Niño",
  NEW_BELIEVER: "Nuevo Creyente",
};

export function AttendanceView() {
  const activeBranch = useChurchAuthStore((s) => s.activeBranch);

  const { data: openEvents = [], isLoading: loadingEvents } = useChurchEvents("OPEN");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const currentEvent = useMemo(
    () => openEvents.find((e) => e.id === selectedEventId) || openEvents[0] || null,
    [openEvents, selectedEventId]
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | PersonType>("ALL");

  const { data: people = [], isLoading: loadingPeople } = useChurchPeople({
    search: search.trim() || undefined,
    branch_id: activeBranch?.id || undefined,
    person_type: typeFilter === "ALL" ? undefined : typeFilter,
    limit: 150,
  });

  const { data: attendance = [] } = useChurchAttendance(currentEvent?.id);

  const attendanceByPerson = useMemo(() => {
    const map = new Map<string, (typeof attendance)[number]>();
    for (const a of attendance) {
      map.set(a.person_id, a);
    }
    return map;
  }, [attendance]);

  const checkInMutation = useCheckInAttendance();
  const uncheckMutation = useUncheckAttendance();
  const createEventMutation = useCreateChurchEvent();
  const updateStatusMutation = useUpdateEventStatus();
  const createPersonMutation = useCreateChurchPerson();

  // Quick Event Modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("Culto Dominical");

  // FAB New Person Modal
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [personType, setPersonType] = useState<PersonType>("VISITOR");
  const [markNow, setMarkNow] = useState(true);

  const openNewPersonModal = (prefillName = "") => {
    setFullName(prefillName);
    setPhone("");
    setPersonType("VISITOR");
    setMarkNow(Boolean(currentEvent));
    setPersonModalOpen(true);
  };

  const handleToggleAttendance = (person: ChurchPerson) => {
    if (!currentEvent) {
      toast.warning("Primero inicia o selecciona un evento abierto de hoy");
      setEventModalOpen(true);
      return;
    }

    const existing = attendanceByPerson.get(person.id);
    if (existing) {
      uncheckMutation.mutate({ id: existing.id, eventId: currentEvent.id });
    } else {
      checkInMutation.mutate({
        event_id: currentEvent.id,
        person_id: person.id,
        person_name: person.full_name,
        person_type: person.person_type,
      });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const ev = await createEventMutation.mutateAsync({
      title: newEventTitle.trim(),
      event_date: new Date().toISOString(),
    });
    setSelectedEventId(ev.id);
    setEventModalOpen(false);
  };

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const created = await createPersonMutation.mutateAsync({
      branch_id: activeBranch?.id || undefined,
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      person_type: personType,
    });
    if (markNow && currentEvent) {
      checkInMutation.mutate({
        event_id: currentEvent.id,
        person_id: created.id,
        person_name: created.full_name,
        person_type: created.person_type,
      });
    } else {
      toast.success(`${created.full_name} registrado(a) en el directorio`);
    }
    setPersonModalOpen(false);
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-white">Asistencia y Eventos</h1>
          <p className="text-xs text-slate-400">
            Toca el botón de check para marcar o desmarcar al instante
          </p>
        </div>
        <Badge variant="default" className="text-xs px-3 py-1 shrink-0">
          {attendance.length} presentes
        </Badge>
      </div>

      {/* Active Event Bar */}
      <Card className="border-sky-400/20">
        <CardContent className="p-3.5 space-y-2.5">
          {loadingEvents ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              Cargando eventos abiertos...
            </div>
          ) : openEvents.length === 0 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-300">No hay eventos abiertos hoy.</p>
              <Button size="sm" onClick={() => setEventModalOpen(true)}>
                <CalendarPlus className="h-4 w-4" />
                Iniciar Culto
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Select
                  value={currentEvent?.id || ""}
                  onValueChange={setSelectedEventId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar evento abierto" />
                  </SelectTrigger>
                  <SelectContent>
                    {openEvents.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setEventModalOpen(true)}
                  title="Nuevo evento"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {currentEvent && (
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-emerald-300 font-medium">● Abierto para registro</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateStatusMutation.mutate({ id: currentEvent.id, status: "CLOSED" })
                    }
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Lock className="h-3 w-3" />
                    Cerrar culto
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Type Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: "ALL" as const, label: "Todos" },
          { key: "MEMBER" as const, label: "Miembros" },
          { key: "VISITOR" as const, label: "Visitantes" },
          { key: "CHILD" as const, label: "Niños" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTypeFilter(tab.key)}
            className={`min-h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
              typeFilter === tab.key
                ? "bg-sky-500/20 border-sky-400/50 text-sky-200"
                : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* People List */}
      <div className="space-y-2">
        {loadingPeople ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-400" />
              Cargando directorio...
            </CardContent>
          </Card>
        ) : people.length === 0 ? (
          <Card>
            <CardContent className="p-7 text-center space-y-3">
              <Users className="h-8 w-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No se encontraron personas</p>
              <p className="text-xs text-slate-400">
                {search.trim()
                  ? `No hay coincidencias para "${search.trim()}".`
                  : "Agrega el primer asistente con el botón +."}
              </p>
              <Button size="sm" onClick={() => openNewPersonModal(search.trim())}>
                <UserPlus className="h-4 w-4" />
                Registrar Nuevo Ingreso
              </Button>
            </CardContent>
          </Card>
        ) : (
          people.map((person) => {
            const isChecked = attendanceByPerson.has(person.id);
            return (
              <div
                key={person.id}
                className={`glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  isChecked ? "border-emerald-400/40 bg-emerald-950/25" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{person.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="slate" className="text-[10px]">
                      {PERSON_TYPE_LABELS[person.person_type] || person.person_type}
                    </Badge>
                    {person.phone && (
                      <span className="text-[11px] text-slate-400 truncate">{person.phone}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAttendance(person)}
                  aria-label={isChecked ? "Desmarcar asistencia" : "Marcar asistencia"}
                  className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer ${
                    isChecked
                      ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/40"
                      : "bg-slate-950/60 border-white/15 text-slate-400 hover:border-sky-400/50 hover:text-sky-300"
                  }`}
                >
                  <Check className="h-5 w-5 stroke-[2.75]" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (+) */}
      <button
        type="button"
        onClick={() => openNewPersonModal("")}
        aria-label="Nuevo Ingreso"
        className="fixed bottom-20 right-4 sm:right-[calc(50%-13rem)] z-30 h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-950/80 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Event Modal */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Culto / Reunión</DialogTitle>
            <DialogDescription>Inicia un evento para comenzar a tomar asistencia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="att-event-title">Nombre del Evento</Label>
              <Input
                id="att-event-title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Ej. Culto Dominical / Escuela de Niños"
                required
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Culto Dominical", "Reunión de Oración", "Escuela de Niños", "Célula"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewEventTitle(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEventModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear y Seleccionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Person FAB Modal */}
      <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Ingreso Rápido</DialogTitle>
            <DialogDescription>
              Registra una persona nueva en el directorio de la iglesia.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePerson} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="new-person-name">Nombre Completo *</Label>
              <Input
                id="new-person-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Pedro Martínez"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-person-phone">Teléfono (WhatsApp)</Label>
              <Input
                id="new-person-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 0414-1234567"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={personType} onValueChange={(v) => setPersonType(v as PersonType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISITOR">Visitante</SelectItem>
                  <SelectItem value="NEW_BELIEVER">Nuevo Creyente</SelectItem>
                  <SelectItem value="MEMBER">Miembro</SelectItem>
                  <SelectItem value="CHILD">Niño</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentEvent && (
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={markNow}
                  onChange={(e) => setMarkNow(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                Marcar asistencia en &quot;{currentEvent.title}&quot; de una vez
              </label>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPersonModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPersonMutation.isPending || !fullName.trim()}>
                {createPersonMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
