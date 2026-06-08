export type UserRole = "super_admin" | "clinic_owner" | "receptionist" | "doctor" | "staff";
export type AssignableUserRole = Exclude<UserRole, "super_admin">;
export type ClinicType = "medical" | "dental" | "aesthetic" | "physiotherapy" | "diagnostic" | "wellness" | "other";

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  postal_code: string | null;
  country: "Philippines";
  timezone: "Asia/Manila";
  logo_url: string | null;
  primary_color: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  clinic_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "inactive";
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SmsProviderOption = "semaphore" | "twilio" | "infobip";

export type ClinicSettings = {
  id: string;
  clinic_id: string;
  clinic_type: ClinicType;
  prc_number: string | null;
  ptr_number: string | null;
  tin: string | null;
  philhealth_accreditation_no: string | null;
  default_language: string;
  default_currency: "PHP";
  timezone: "Asia/Manila";
  ai_provider: AiProviderOption;
  ai_model: string;
  ai_tone: AiTone;
  ai_welcome_message: string;
  ai_booking_instructions: string | null;
  ai_enabled: boolean;
  ai_widget_enabled: boolean;
  notify_booking_confirmation: boolean;
  notify_appointment_confirmed: boolean;
  notify_appointment_rescheduled: boolean;
  notify_appointment_cancelled: boolean;
  notify_appointment_reminder: boolean;
  reminder_hours_before: number;
  sms_enabled: boolean;
  sms_provider: SmsProviderOption | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  clinic_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserInvite = {
  id: string;
  clinic_id: string;
  email: string;
  role: AssignableUserRole;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  invited_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type PatientGender = "male" | "female" | "other" | "prefer_not_to_say";

export type Patient = {
  id: string;
  clinic_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  birth_date: string | null;
  gender: PatientGender | null;
  address_line_1: string | null;
  address_line_2: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Doctor = {
  id: string;
  clinic_id: string;
  profile_id: string | null;
  full_name: string;
  specialization: string | null;
  license_no: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price_centavos: number;
  color: string;
  icon: string | null;
  online_booking_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRule = {
  id: string;
  clinic_id: string;
  doctor_id: string | null;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  slot_interval_minutes: number;
  created_at: string;
  updated_at: string;
};

export type BlockedDate = {
  id: string;
  clinic_id: string;
  doctor_id: string | null;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  is_holiday: boolean;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentSource = "manual" | "widget" | "ai" | "phone" | "walk_in";

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  service_id: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  start_at: string;
  end_at: string;
  notes: string | null;
  cancellation_reason: string | null;
  confirmation_token: string | null;
  patient_notified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentWithRelations = Appointment & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email"> | null;
  doctors: Pick<Doctor, "id" | "full_name" | "specialization"> | null;
  services: Pick<Service, "id" | "name" | "duration_minutes" | "price_centavos" | "color"> | null;
};

export type AiProviderOption = "openai" | "ollama";
export type AiTone = "professional" | "friendly" | "formal" | "casual";
export type AiConversationChannel = "widget" | "dashboard" | "facebook" | "whatsapp" | "sms";
export type AiConversationStatus = "open" | "booked" | "handoff" | "closed";
export type AiMessageRole = "user" | "assistant" | "system" | "tool";

export type FaqItem = {
  id: string;
  clinic_id: string;
  question: string;
  answer: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AiConversation = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_temp_id: string | null;
  channel: AiConversationChannel;
  status: AiConversationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  conversation_id: string;
  clinic_id: string;
  role: AiMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AiConversationWithMessages = AiConversation & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email"> | null;
  ai_messages: AiMessage[];
};

export type AppointmentNotificationChannel = "email" | "sms";
export type AppointmentNotificationType =
  | "booking_confirmation"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_reminder";
export type AppointmentNotificationStatus = "pending" | "sent" | "failed";

export type AppointmentNotification = {
  id: string;
  clinic_id: string;
  appointment_id: string;
  channel: AppointmentNotificationChannel;
  notification_type: AppointmentNotificationType;
  recipient: string;
  status: AppointmentNotificationStatus;
  error: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  created_at: string;
};
