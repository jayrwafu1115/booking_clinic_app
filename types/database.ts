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
  hero_image_urls: string[];
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
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
export type PatientStatus = "active" | "critical" | "inactive";

export type Patient = {
  id: string;
  clinic_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  birth_date: string | null;
  gender: PatientGender | null;
  status: PatientStatus;
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
  ical_token: string | null;
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
  image_url: string | null;
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
  room_id: string | null;
  recurrence_id: string | null;
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

export type SubscriptionPlan = {
  id: string;
  name: string;
  price_monthly_centavos: number;
  price_annual_centavos: number;
  max_users: number;
  max_doctors: number;
  ai_enabled: boolean;
  features: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClinicSubscriptionStatus = "free" | "active" | "past_due" | "cancelled" | "suspended";

export type ClinicSubscription = {
  id: string;
  clinic_id: string;
  plan_id: string | null;
  status: ClinicSubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  paymongo_subscription_id: string | null;
  paymongo_customer_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Phase 2 types ────────────────────────────────────────────────────────────

export type Room = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  capacity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type PaymentMethod = "cash" | "gcash" | "card" | "bank_transfer" | "philhealth" | "hmo";

export type Invoice = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal_centavos: number;
  discount_centavos: number;
  total_centavos: number;
  notes: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  clinic_id: string;
  description: string;
  quantity: number;
  unit_price_centavos: number;
  total_centavos: number;
  created_at: string;
};

export type Payment = {
  id: string;
  clinic_id: string;
  invoice_id: string;
  patient_id: string;
  amount_centavos: number;
  method: PaymentMethod;
  reference_no: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type InvoiceWithRelations = Invoice & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email"> | null;
  invoice_items: InvoiceItem[];
  payments: Payment[];
};

export type ClinicalNote = {
  id: string;
  clinic_id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  is_locked: boolean;
  locked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FormFieldType = "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "number";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
};

export type FormTemplate = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FormSubmission = {
  id: string;
  clinic_id: string;
  template_id: string;
  patient_id: string | null;
  appointment_id: string | null;
  token: string;
  answers: Record<string, string | string[]>;
  submitted_at: string | null;
  created_at: string;
};

export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type AppointmentRecurrence = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  service_id: string;
  frequency: RecurrenceFrequency;
  session_count: number;
  start_at: string;
  created_by: string | null;
  created_at: string;
};

export type TreatmentPackage = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  session_count: number;
  price_centavos: number;
  validity_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PatientPackageStatus = "active" | "expired" | "exhausted" | "cancelled";

export type PatientPackage = {
  id: string;
  clinic_id: string;
  patient_id: string;
  package_id: string;
  purchased_at: string;
  expires_at: string;
  sessions_total: number;
  sessions_used: number;
  status: PatientPackageStatus;
  paid_amount_centavos: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PackageRedemption = {
  id: string;
  clinic_id: string;
  patient_package_id: string;
  appointment_id: string | null;
  redeemed_at: string;
  created_by: string | null;
};

export type QueueStatus = "waiting" | "called" | "serving" | "done" | "skipped";

export type QueueEntry = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  doctor_id: string | null;
  service_id: string | null;
  queue_number: number;
  status: QueueStatus;
  patient_name: string;
  notes: string | null;
  queue_date: string;
  called_at: string | null;
  served_at: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QueueEntryWithRelations = QueueEntry & {
  doctors: Pick<Doctor, "id" | "full_name"> | null;
  services: Pick<Service, "id" | "name"> | null;
};
