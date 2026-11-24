import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { useOfflineQueueStore } from "@/lib/offline-queue";
import { getApiErrorMessage, isNetworkError } from "@/lib/utils";
import type { ChurchAttendance, ChurchPendingOffering, ChurchPerson, EventStatus } from "@/types/church";
import {
  churchService,
  type CheckInPayload,
  type CreateEventPayload,
  type CreateOfferingPayload,
  type CreatePersonPayload,
  type ListPeopleParams,
  type ResubmitOfferingPayload,
} from "../services/church.service";

export function useChurchPeople(params: ListPeopleParams, enabled = true) {
  return useQuery({
    queryKey: ["church-people", params],
    queryFn: () => churchService.listPeople(params),
    enabled,
  });
}

export function useCreateChurchPerson() {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const companyId = useChurchAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (payload: CreatePersonPayload) => {
      const id = payload.id || crypto.randomUUID();
      const fullPayload: CreatePersonPayload = { ...payload, id };
      try {
        return await churchService.createPerson(fullPayload);
      } catch (err) {
        if (isNetworkError(err)) {
          enqueue({
            type: "CREATE_PERSON",
            endpoint: "/church/people",
            payload: fullPayload as unknown as Record<string, unknown>,
          });
          toast.info("Guardado offline — se sincronizará al volver la señal");
          const now = new Date().toISOString();
          const localPerson: ChurchPerson = {
            id,
            company_id: companyId,
            branch_id: payload.branch_id || "",
            full_name: payload.full_name,
            phone: payload.phone || "",
            birth_date: payload.birth_date || "",
            person_type: payload.person_type,
            metadata_json: payload.metadata_json || "{}",
            is_baptized: Boolean(payload.is_baptized),
            baptism_date: payload.baptism_date || "",
            created_at: now,
            updated_at: now,
          };
          return localPerson;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-people"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo registrar la persona"));
    },
  });
}

export function useUpdateBaptism() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: churchService.updateBaptism,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-people"] });
      toast.success("Bautismo actualizado exitosamente");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo registrar el bautismo"));
    },
  });
}

export function useChurchEvents(status?: EventStatus) {
  const ministry = useChurchAuthStore((s) => s.ministry);
  const activeBranch = useChurchAuthStore((s) => s.activeBranch);
  const role = useChurchAuthStore((s) => s.role);

  return useQuery({
    queryKey: ["church-events", ministry?.id, activeBranch?.id, status || "ALL"],
    queryFn: () =>
      churchService.listEvents({
        ministry_id: role !== "CHURCH_MINISTRY" ? ministry?.id : undefined,
        branch_id: activeBranch?.id || undefined,
        status,
      }),
    enabled: Boolean(ministry?.id),
  });
}

export function useCreateChurchEvent() {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const ministry = useChurchAuthStore((s) => s.ministry);
  const activeBranch = useChurchAuthStore((s) => s.activeBranch);
  const role = useChurchAuthStore((s) => s.role);
  const companyId = useChurchAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (payload: Omit<CreateEventPayload, "ministry_id">) => {
      const id = payload.id || crypto.randomUUID();
      const fullPayload: CreateEventPayload = {
        ...payload,
        id,
        branch_id: payload.branch_id ?? activeBranch?.id ?? undefined,
        ministry_id: role !== "CHURCH_MINISTRY" ? ministry?.id : undefined,
      };
      try {
        return await churchService.createEvent(fullPayload);
      } catch (err) {
        if (isNetworkError(err)) {
          enqueue({
            type: "CREATE_EVENT",
            endpoint: "/church/events",
            payload: fullPayload as unknown as Record<string, unknown>,
          });
          toast.info("Evento guardado offline — se sincronizará al volver la señal");
          const now = new Date().toISOString();
          return {
            id,
            company_id: companyId,
            branch_id: fullPayload.branch_id || "",
            ministry_id: ministry?.id || "",
            title: fullPayload.title,
            description: fullPayload.description || "",
            event_date: fullPayload.event_date,
            status: "OPEN" as const,
            created_at: now,
            updated_at: now,
          };
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-events"] });
      toast.success("Evento iniciado correctamente");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo crear el evento"));
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      churchService.updateEventStatus(id, status),
    onSuccess: (ev) => {
      queryClient.invalidateQueries({ queryKey: ["church-events"] });
      toast.success(ev.status === "CLOSED" ? "Evento cerrado" : "Evento reabierto");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo actualizar el estado del evento"));
    },
  });
}

export function useChurchAttendance(eventId?: string) {
  return useQuery({
    queryKey: ["church-attendance", eventId],
    queryFn: () => churchService.listAttendance(eventId!),
    enabled: Boolean(eventId),
  });
}

export function useCheckInAttendance() {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const companyId = useChurchAuthStore((s) => s.companyId);
  const volunteerName = useChurchAuthStore((s) => s.volunteerName);

  return useMutation({
    mutationFn: async (
      input: CheckInPayload & { person_name?: string; person_type?: string }
    ) => {
      const id = input.id || crypto.randomUUID();
      const payload: CheckInPayload = {
        id,
        event_id: input.event_id,
        person_id: input.person_id,
        check_in_at: input.check_in_at || new Date().toISOString(),
        security_code: input.security_code,
      };
      try {
        return await churchService.checkIn(payload);
      } catch (err) {
        if (isNetworkError(err)) {
          enqueue({
            type: "CHECK_IN",
            endpoint: `/church/events/${input.event_id}/attendance/check-in`,
            payload: {
              id,
              person_id: input.person_id,
              check_in_at: payload.check_in_at,
              security_code: input.security_code,
            },
          });
          toast.info("Asistencia guardada offline");
          const localAtt: ChurchAttendance = {
            id,
            company_id: companyId,
            event_id: input.event_id,
            person_id: input.person_id,
            person_name: input.person_name || "",
            person_type: input.person_type || "VISITOR",
            check_in_at: payload.check_in_at!,
            security_code: input.security_code || "",
            registered_by_name: volunteerName,
          };
          return localAtt;
        }
        throw err;
      }
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["church-attendance", vars.event_id] });
      const prev = queryClient.getQueryData<ChurchAttendance[]>(["church-attendance", vars.event_id]);
      const optimistic: ChurchAttendance = {
        id: vars.id || `temp-${vars.person_id}`,
        company_id: companyId,
        event_id: vars.event_id,
        person_id: vars.person_id,
        person_name: vars.person_name || "",
        person_type: vars.person_type || "MEMBER",
        check_in_at: new Date().toISOString(),
        security_code: vars.security_code || "",
        registered_by_name: volunteerName,
      };
      queryClient.setQueryData<ChurchAttendance[]>(
        ["church-attendance", vars.event_id],
        (old = []) => [optimistic, ...old.filter((a) => a.person_id !== vars.person_id)]
      );
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }
      return { prev, eventId: vars.event_id };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["church-attendance", ctx.eventId], ctx.prev);
      }
      toast.error(getApiErrorMessage(err, "No se pudo marcar asistencia"));
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ["church-attendance", vars.event_id] });
    },
  });
}

export function useUncheckAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; eventId: string }) => churchService.deleteAttendance(id),
    onMutate: async ({ id, eventId }) => {
      await queryClient.cancelQueries({ queryKey: ["church-attendance", eventId] });
      const prev = queryClient.getQueryData<ChurchAttendance[]>(["church-attendance", eventId]);
      queryClient.setQueryData<ChurchAttendance[]>(
        ["church-attendance", eventId],
        (old = []) => old.filter((a) => a.id !== id)
      );
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      return { prev, eventId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["church-attendance", ctx.eventId], ctx.prev);
      }
      toast.error(getApiErrorMessage(err, "No se pudo desmarcar asistencia"));
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ["church-attendance", vars.eventId] });
    },
  });
}

export function useCheckOutAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; eventId: string }) => churchService.checkOut(id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["church-attendance", vars.eventId] });
      toast.success("Entrega del niño registrada (Check-out)");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo registrar el check-out"));
    },
  });
}

export function useMyChurchOfferings() {
  const ministry = useChurchAuthStore((s) => s.ministry);
  const role = useChurchAuthStore((s) => s.role);

  return useQuery({
    queryKey: ["church-offerings-mine", ministry?.id],
    queryFn: () =>
      churchService.listMyOfferings({
        ministry_id: role !== "CHURCH_MINISTRY" ? ministry?.id : undefined,
      }),
    enabled: Boolean(ministry?.id) && (role !== "CHURCH_MINISTRY" || Boolean(ministry?.features?.offerings)),
  });
}

export function useCreatePendingOffering() {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const ministry = useChurchAuthStore((s) => s.ministry);
  const activeBranch = useChurchAuthStore((s) => s.activeBranch);
  const role = useChurchAuthStore((s) => s.role);
  const companyId = useChurchAuthStore((s) => s.companyId);
  const volunteerName = useChurchAuthStore((s) => s.volunteerName);

  return useMutation({
    mutationFn: async (payload: Omit<CreateOfferingPayload, "ministry_id">) => {
      const id = payload.id || crypto.randomUUID();
      const fullPayload: CreateOfferingPayload = {
        ...payload,
        id,
        branch_id: payload.branch_id ?? activeBranch?.id ?? undefined,
        ministry_id: role !== "CHURCH_MINISTRY" ? ministry?.id : undefined,
      };
      try {
        return await churchService.createOffering(fullPayload);
      } catch (err) {
        if (isNetworkError(err)) {
          enqueue({
            type: "CREATE_OFFERING",
            endpoint: "/church/offerings",
            payload: fullPayload as unknown as Record<string, unknown>,
          });
          toast.info("Ofrenda guardada offline — se enviará a KlaroConta al reconectar");
          const now = new Date().toISOString();
          const localOff: ChurchPendingOffering = {
            id,
            company_id: companyId,
            branch_id: fullPayload.branch_id || "",
            branch_name: activeBranch?.name || "",
            ministry_id: ministry?.id || "",
            ministry_name: ministry?.name || "",
            event_id: fullPayload.event_id || "",
            offering_type: fullPayload.offering_type,
            donor_name: fullPayload.donor_name || "",
            currency: fullPayload.currency,
            payment_method: fullPayload.payment_method,
            reference_number: fullPayload.reference_number || "",
            amount: fullPayload.amount,
            offering_date: fullPayload.offering_date,
            notes: fullPayload.notes || "",
            review_status: "PENDING_REVIEW",
            rejection_reason: "",
            reported_by_name: volunteerName,
            reviewed_by_user_id: "",
            reviewed_by_name: "",
            klaroconta_transaction_id: "",
            created_at: now,
            updated_at: now,
          };
          return localOff;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-offerings-mine"] });
      toast.success("Ofrenda enviada a revisión en KlaroConta");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo registrar la ofrenda"));
    },
  });
}

export function useResubmitOffering() {
  const queryClient = useQueryClient();
  const ministry = useChurchAuthStore((s) => s.ministry);
  const role = useChurchAuthStore((s) => s.role);

  return useMutation({
    mutationFn: (payload: Omit<ResubmitOfferingPayload, "ministry_id">) =>
      churchService.resubmitOffering({
        ...payload,
        ministry_id: role !== "CHURCH_MINISTRY" ? ministry?.id : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-offerings-mine"] });
      toast.success("Ofrenda corregida y reenviada a KlaroConta");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No se pudo reenviar la ofrenda"));
    },
  });
}
