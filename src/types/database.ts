export type UserRole = "client" | "admin";

export type ClientSex =
  | "female"
  | "male"
  | "other"
  | "prefer_not_to_say";

export type AppointmentStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "waived"
  | "failed"
  | "refunded"
  | "expired";

export type PaymentMethod =
  | "paymongo"
  | "cash"
  | "gcash_manual"
  | "bank_transfer"
  | "pro_bono"
  | "waived";

export type UnavailableReason =
  | "lunch_break"
  | "meeting"
  | "holiday"
  | "vacation"
  | "training"
  | "administrative"
  | "personal"
  | "other"
  // Legacy values kept for existing rows
  | "emergency"
  | "leave"
  | "clinic_closed";

export type BlockRecurrenceType =
  | "none"
  | "daily"
  | "weekday"
  | "weekly"
  | "monthly"
  | "custom";

export type BlockRecurrenceEndType = "never" | "on_date" | "after_count";

export type BlockLayer = "rule" | "override";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  birthdate: string | null;
  sex: ClientSex | null;
  address: string | null;
  city: string | null;
  province: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  assigned_psychologist_id: string | null;
  is_active: boolean;
  internal_notes: string | null;
  role: UserRole;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientProfileEvent {
  id: string;
  client_id: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_by: string | null;
  created_at: string;
}

/** Polymorphic staff note entity kinds. */
export type StaffNoteEntityType =
  | "client"
  | "appointment"
  | "psychologist"
  | "payment";

export interface StaffNote {
  id: string;
  entity_type: StaffNoteEntityType;
  entity_id: string;
  author_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
}

export interface StaffNoteWithAuthor extends StaffNote {
  author: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

/** Appointment collaboration comments (non-clinical). */
export type AppointmentCommentKind = "comment" | "system";

export interface AppointmentComment {
  id: string;
  appointment_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  kind: AppointmentCommentKind;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AppointmentCommentWithAuthor extends AppointmentComment {
  author: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: UserRole;
  } | null;
}

export type ActivityEntityType =
  | "appointment"
  | "block"
  | "client"
  | "psychologist";

export type ActivityActorType =
  | "admin"
  | "psychologist"
  | "client"
  | "system";

export interface EntityActivity {
  id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  actor_id: string | null;
  actor_type: ActivityActorType;
  action: string;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EntityActivityWithActor extends EntityActivity {
  actor: {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface Psychologist {
  id: string;
  /** URL segment for admin routes; unique. UUIDs remain the PK. */
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  specialties: string[];
  photo_url: string | null;
  email: string | null;
  license_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PsychologistService {
  id: string;
  psychologist_id: string;
  service_id: string;
  created_at: string;
}

export interface AvailabilityBlock {
  id: string;
  psychologist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnavailableBlock {
  id: string;
  psychologist_id: string;
  start_at: string;
  end_at: string;
  reason: UnavailableReason;
  notes: string | null;
  title: string | null;
  /** rule = recurring default; override = calendar exception. */
  layer?: BlockLayer;
  /** Full-day one-time override (vacation spanning dates). */
  all_day?: boolean;
  /** Override replaces this recurring rule on covered dates. */
  suppresses_rule_id?: string | null;
  series_id: string | null;
  recurrence_type: BlockRecurrenceType;
  recurrence_interval: number;
  recurrence_days: number[];
  recurrence_end_type: BlockRecurrenceEndType;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionField {
  id: string;
  type: "text" | "textarea" | "select" | "checkbox";
  label: string;
  required: boolean;
  options?: string[];
}

export interface Appointment {
  id: string;
  client_id: string;
  psychologist_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  payment_due_at: string | null;
  notes: string | null;
  is_admin_booking: boolean;
  completed_at: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  appointment_id: string;
  questionnaire_id: string;
  client_id: string;
  responses: Record<string, string | boolean>;
  submitted_at: string;
  created_at: string;
}

export interface Payment {
  id: string;
  appointment_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod | null;
  paymongo_checkout_id: string | null;
  paymongo_payment_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClinicSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  psychologist?: Psychologist;
  service?: Service;
  client?: Profile;
  payment?: Payment;
  questionnaire_response?: QuestionnaireResponse;
}

export interface ClinicSettingsMap {
  minimum_advance_booking_hours: number;
  payment_hold_hours: number;
  allow_same_day_booking: boolean;
  allow_admin_booking_without_payment: boolean;
  default_timezone: string;
  /** JS day-of-week values when the clinic is open (0 = Sun … 6 = Sat) */
  working_days: number[];
}
