import { apiClient } from "@/lib/axios";
import type {
  ChurchAttendance,
  ChurchBranch,
  ChurchEvent,
  ChurchMinistry,
  ChurchPendingOffering,
  ChurchPerson,
  EventStatus,
  OfferingCurrency,
  OfferingPaymentMethod,
  OfferingReviewStatus,
  OfferingType,
  PersonType,
} from "@/types/church";

export interface ListPeopleParams {
  search?: string;
  branch_id?: string;
  person_type?: PersonType;
  is_baptized?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreatePersonPayload {
  id?: string;
  branch_id?: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  person_type: PersonType;
  metadata_json?: string;
  is_baptized?: boolean;
  baptism_date?: string;
}

export interface CreateEventPayload {
  id?: string;
  branch_id?: string;
  ministry_id?: string;
  title: string;
  description?: string;
  event_date: string;
}

export interface CheckInPayload {
  id?: string;
  event_id: string;
  person_id: string;
  check_in_at?: string;
  security_code?: string;
}

export interface CreateOfferingPayload {
  id?: string;
  branch_id?: string;
  ministry_id?: string;
  event_id?: string;
  offering_type: OfferingType;
  donor_name?: string;
  currency: OfferingCurrency;
  payment_method: OfferingPaymentMethod;
  reference_number?: string;
  amount: number;
  offering_date: string;
  notes?: string;
}

export interface ResubmitOfferingPayload extends Omit<CreateOfferingPayload, "id"> {
  id: string;
}

export const churchService = {
  // Admin catalogs (when logged as ADMIN/EMPRESA)
  listBranches: async (): Promise<ChurchBranch[]> => {
    const res = await apiClient.get<{ branches: ChurchBranch[] }>("/church/branches");
    return res.data?.branches ?? [];
  },

  listMinistries: async (): Promise<ChurchMinistry[]> => {
    const res = await apiClient.get<{ ministries: ChurchMinistry[] }>("/church/ministries");
    return res.data?.ministries ?? [];
  },

  // People
  listPeople: async (params: ListPeopleParams = {}): Promise<ChurchPerson[]> => {
    const res = await apiClient.get<{ people: ChurchPerson[] }>("/church/people", {
      params: {
        search: params.search || undefined,
        branch_id: params.branch_id || undefined,
        person_type: params.person_type || undefined,
        is_baptized: params.is_baptized !== undefined ? params.is_baptized : undefined,
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
      },
    });
    return res.data?.people ?? [];
  },

  createPerson: async (payload: CreatePersonPayload): Promise<ChurchPerson> => {
    const res = await apiClient.post<{ person: ChurchPerson }>("/church/people", payload);
    return res.data.person;
  },

  updateBaptism: async (payload: {
    id: string;
    is_baptized: boolean;
    baptism_date?: string;
  }): Promise<ChurchPerson> => {
    const { id, ...body } = payload;
    const res = await apiClient.patch<{ person: ChurchPerson }>(`/church/people/${id}/baptism`, body);
    return res.data.person;
  },

  // Events
  listEvents: async (params: {
    branch_id?: string;
    ministry_id?: string;
    status?: EventStatus;
    limit?: number;
  } = {}): Promise<ChurchEvent[]> => {
    const res = await apiClient.get<{ events: ChurchEvent[] }>("/church/events", {
      params: {
        branch_id: params.branch_id || undefined,
        ministry_id: params.ministry_id || undefined,
        status: params.status || undefined,
        limit: params.limit ?? 50,
      },
    });
    return res.data?.events ?? [];
  },

  createEvent: async (payload: CreateEventPayload): Promise<ChurchEvent> => {
    const res = await apiClient.post<{ event: ChurchEvent }>("/church/events", payload);
    return res.data.event;
  },

  updateEventStatus: async (id: string, status: EventStatus): Promise<ChurchEvent> => {
    const res = await apiClient.patch<{ event: ChurchEvent }>(`/church/events/${id}/status`, {
      status,
    });
    return res.data.event;
  },

  // Attendance
  listAttendance: async (eventId: string): Promise<ChurchAttendance[]> => {
    const res = await apiClient.get<{ attendance: ChurchAttendance[] }>(
      `/church/events/${eventId}/attendance`
    );
    return res.data?.attendance ?? [];
  },

  checkIn: async (payload: CheckInPayload): Promise<ChurchAttendance> => {
    const { event_id, ...body } = payload;
    const res = await apiClient.post<{ attendance: ChurchAttendance }>(
      `/church/events/${event_id}/attendance/check-in`,
      body
    );
    return res.data.attendance;
  },

  checkOut: async (id: string): Promise<ChurchAttendance> => {
    const res = await apiClient.post<{ attendance: ChurchAttendance }>(
      `/church/attendance/${id}/check-out`,
      {}
    );
    return res.data.attendance;
  },

  deleteAttendance: async (id: string): Promise<void> => {
    await apiClient.delete(`/church/attendance/${id}`);
  },

  // Offerings
  createOffering: async (payload: CreateOfferingPayload): Promise<ChurchPendingOffering> => {
    const res = await apiClient.post<{ offering: ChurchPendingOffering }>(
      "/church/offerings",
      payload
    );
    return res.data.offering;
  },

  listMyOfferings: async (params: {
    ministry_id?: string;
    review_status?: OfferingReviewStatus;
    limit?: number;
  } = {}): Promise<ChurchPendingOffering[]> => {
    const res = await apiClient.get<{ offerings: ChurchPendingOffering[] }>(
      "/church/offerings/mine",
      {
        params: {
          ministry_id: params.ministry_id || undefined,
          review_status: params.review_status || undefined,
          limit: params.limit ?? 100,
        },
      }
    );
    return res.data?.offerings ?? [];
  },

  resubmitOffering: async (payload: ResubmitOfferingPayload): Promise<ChurchPendingOffering> => {
    const { id, ...body } = payload;
    const res = await apiClient.put<{ offering: ChurchPendingOffering }>(
      `/church/offerings/${id}/resubmit`,
      body
    );
    return res.data.offering;
  },
};
