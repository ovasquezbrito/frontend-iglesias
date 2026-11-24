import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  HeartHandshake,
  Search,
  MessageCircle,
  Droplets,
  Loader2,
  Users,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { useChurchPeople, useUpdateBaptism } from "@/features/church/hooks/use-church-queries";
import { buildWhatsAppUrl, todayDateString } from "@/lib/utils";
import type { ChurchPerson } from "@/types/church";

type ConsolidationFilter = "VISITOR" | "NEW_BELIEVER" | "NOT_BAPTIZED" | "BAPTIZED";

export function ConsolidationView() {
  const churchName = useChurchAuthStore((s) => s.churchName);
  const activeBranch = useChurchAuthStore((s) => s.activeBranch);

  const [filter, setFilter] = useState<ConsolidationFilter>("NEW_BELIEVER");
  const [search, setSearch] = useState("");
  const [baptizingPerson, setBaptizingPerson] = useState<ChurchPerson | null>(null);
  const [baptismDate, setBaptismDate] = useState(todayDateString);

  const { data: people = [], isLoading } = useChurchPeople({
    search: search.trim() || undefined,
    branch_id: activeBranch?.id || undefined,
    person_type:
      filter === "VISITOR" ? "VISITOR" : filter === "NEW_BELIEVER" ? "NEW_BELIEVER" : undefined,
    is_baptized:
      filter === "NOT_BAPTIZED" ? false : filter === "BAPTIZED" ? true : undefined,
    limit: 150,
  });

  const updateBaptismMutation = useUpdateBaptism();

  const handleConfirmBaptism = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baptizingPerson || !baptismDate) return;
    await updateBaptismMutation.mutateAsync({
      id: baptizingPerson.id,
      is_baptized: true,
      baptism_date: baptismDate,
    });
    setBaptizingPerson(null);
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-rose-400" />
          Consolidación y Bautismos
        </h1>
        <p className="text-xs text-slate-400">
          Acompañamiento pastoral por WhatsApp y registro de bautismos
        </p>
      </div>

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

      {/* Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: "NEW_BELIEVER" as const, label: "Nuevos Creyentes" },
          { key: "VISITOR" as const, label: "Visitantes" },
          { key: "NOT_BAPTIZED" as const, label: "Sin Bautizar" },
          { key: "BAPTIZED" as const, label: "Bautizados" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`min-h-9 px-3 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
              filter === tab.key
                ? "bg-rose-500/20 border-rose-400/50 text-rose-200"
                : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-rose-400" />
              Cargando personas...
            </CardContent>
          </Card>
        ) : people.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <Users className="h-8 w-8 text-rose-400/60 mx-auto" />
              <p className="text-sm font-semibold text-white">Sin registros en esta vista</p>
              <p className="text-xs text-slate-400">
                No hay personas que coincidan con el filtro seleccionado.
              </p>
            </CardContent>
          </Card>
        ) : (
          people.map((person) => {
            const waUrl = person.phone
              ? buildWhatsAppUrl(
                  person.phone,
                  `¡Hola ${person.full_name}! Te saludamos con cariño desde ${churchName}. Queremos saber cómo estás y orar por ti.`
                )
              : "";
            const createdLabel = person.created_at
              ? format(parseISO(person.created_at), "d MMM yyyy", { locale: es })
              : "";

            return (
              <Card key={person.id} className="border-rose-400/15">
                <CardContent className="p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-white truncate">{person.full_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        {createdLabel && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {createdLabel}
                          </span>
                        )}
                        {person.phone && <span>· {person.phone}</span>}
                      </div>
                    </div>
                    {person.is_baptized ? (
                      <Badge variant="emerald" className="shrink-0">
                        <Droplets className="h-3 w-3" />
                        Bautizado
                      </Badge>
                    ) : (
                      <Badge variant="rose" className="shrink-0">Sin bautizar</Badge>
                    )}
                  </div>

                  {person.is_baptized && person.baptism_date && (
                    <p className="text-[11px] text-emerald-300/90">
                      Fecha de bautismo: {person.baptism_date}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    {waUrl ? (
                      <Button asChild size="sm" variant="emerald" className="flex-1">
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="flex-1">
                        Sin teléfono
                      </Button>
                    )}

                    {!person.is_baptized && (
                      <Button
                        size="sm"
                        variant="rose"
                        className="flex-1"
                        onClick={() => {
                          setBaptizingPerson(person);
                          setBaptismDate(todayDateString());
                        }}
                      >
                        <Droplets className="h-4 w-4" />
                        Registrar Bautismo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Register Baptism Modal */}
      <Dialog
        open={Boolean(baptizingPerson)}
        onOpenChange={(open) => !open && setBaptizingPerson(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-rose-400" />
              Registrar Bautismo
            </DialogTitle>
            <DialogDescription>
              Indica la fecha de bautismo de{" "}
              <strong className="text-white">{baptizingPerson?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmBaptism} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="baptism-date">Fecha de Bautismo *</Label>
              <Input
                id="baptism-date"
                type="date"
                value={baptismDate}
                onChange={(e) => setBaptismDate(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBaptizingPerson(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="rose"
                disabled={updateBaptismMutation.isPending || !baptismDate}
              >
                {updateBaptismMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Bautismo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
