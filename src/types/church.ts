export interface ChurchBranch {
  id: string;
  company_id: string;
  name: string;
  address: string;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChurchMinistryFeatures {
  attendance: boolean;
  kids_checkin: boolean;
  baptisms: boolean;
  offerings: boolean;
}

export interface ChurchMinistry {
  id: string;
  company_id: string;
  name: string;
  description: string;
  features: ChurchMinistryFeatures;
  access_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PersonType = "VISITOR" | "MEMBER" | "CHILD" | "NEW_BELIEVER";

export interface ChurchKidMetadata {
  guardian_name?: string;
  guardian_phone?: string;
  allergies?: string;
  pastoral_notes?: string;
}

export interface ChurchPerson {
  id: string;
  company_id: string;
  branch_id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  person_type: PersonType;
  metadata_json: string;
  is_baptized: boolean;
  baptism_date: string;
  created_at: string;
  updated_at: string;
}

export type EventStatus = "OPEN" | "CLOSED";

export interface ChurchEvent {
  id: string;
  company_id: string;
  branch_id: string;
  ministry_id: string;
  title: string;
  description: string;
  event_date: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface ChurchAttendance {
  id: string;
  company_id: string;
  event_id: string;
  person_id: string;
  person_name: string;
  person_type: PersonType | string;
  check_in_at: string;
  check_out_at?: string;
  security_code: string;
  registered_by_name: string;
}

export type OfferingCurrency = "VES" | "USD";
export type OfferingPaymentMethod = "EFECTIVO" | "PAGO_MOVIL" | "TRANSFERENCIA" | "ZELLE";
export type OfferingType = "OFRENDA_GENERAL" | "DIEZMO" | "PRIMICIA" | "OFRENDA_ESPECIAL";
export type OfferingReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface ChurchPendingOffering {
  id: string;
  company_id: string;
  branch_id: string;
  branch_name: string;
  ministry_id: string;
  ministry_name: string;
  event_id: string;
  offering_type: OfferingType | string;
  donor_name: string;
  currency: OfferingCurrency | string;
  payment_method: OfferingPaymentMethod | string;
  reference_number: string;
  amount: number;
  offering_date: string;
  notes: string;
  review_status: OfferingReviewStatus;
  rejection_reason: string;
  reported_by_name: string;
  reviewed_by_user_id: string;
  reviewed_by_name: string;
  reviewed_at?: string;
  klaroconta_transaction_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChurchLoginResponse {
  session_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  company_id: string;
  company_name: string;
  ministry: ChurchMinistry;
  volunteer_name: string;
  ministry_role: "LEADER" | "VOLUNTEER";
  assigned_branch_id: string;
  branches: ChurchBranch[];
}

export interface ChurchContextResponse {
  company_id: string;
  company_name: string;
  ministry: ChurchMinistry;
  volunteer_name: string;
  ministry_role: "LEADER" | "VOLUNTEER";
  assigned_branch_id: string;
  branches: ChurchBranch[];
}

export interface KlaroContaLoginResponse {
  user: {
    id: string;
    company_id: string;
    name_rol: string;
    full_name: string;
    email: string;
    name_company: string;
    tax_id: string;
    has_church_module?: boolean;
  };
  session_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}
