// Server-only: never import this file from client components.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatManilaDateTime } from "@/lib/utils/format";
import { sendResendEmail } from "./resend";
import { sendSmsNotification } from "./sms";
import {
  buildBookingConfirmationSms,
  buildAppointmentConfirmedSms,
  buildAppointmentRescheduledSms,
  buildAppointmentCancelledSms,
  buildAppointmentReminderSms,
} from "./sms/templates";
import {
  buildBookingConfirmationEmail,
  buildAppointmentConfirmedEmail,
  buildAppointmentRescheduledEmail,
  buildAppointmentCancelledEmail,
  buildAppointmentReminderEmail,
  type AppointmentEmailData
} from "./templates";
import type { AppointmentNotificationType, Clinic, ClinicSettings } from "@/types/database";

type NotificationSettingsSlice = Pick<
  ClinicSettings,
  | "notify_booking_confirmation"
  | "notify_appointment_confirmed"
  | "notify_appointment_rescheduled"
  | "notify_appointment_cancelled"
  | "notify_appointment_reminder"
  | "sms_enabled"
  | "sms_provider"
>;

const defaultNotificationSettings: NotificationSettingsSlice = {
  notify_booking_confirmation: true,
  notify_appointment_confirmed: true,
  notify_appointment_rescheduled: true,
  notify_appointment_cancelled: true,
  notify_appointment_reminder: false,
  sms_enabled: false,
  sms_provider: null,
};

function isNotificationEnabled(type: AppointmentNotificationType, settings: NotificationSettingsSlice): boolean {
  switch (type) {
    case "booking_confirmation":
      return settings.notify_booking_confirmation;
    case "appointment_confirmed":
      return settings.notify_appointment_confirmed;
    case "appointment_rescheduled":
      return settings.notify_appointment_rescheduled;
    case "appointment_cancelled":
      return settings.notify_appointment_cancelled;
    case "appointment_reminder":
      return settings.notify_appointment_reminder;
  }
}

export type SendAppointmentEmailParams = {
  type: AppointmentNotificationType;
  clinicId: string;
  appointmentId: string;
  patientEmail: string | null;
  patientPhone: string | null;
  patientName: string;
  serviceName: string;
  doctorName: string | null;
  startAt: string;
  endAt: string;
  clinic: Pick<Clinic, "id" | "name" | "address_line_1" | "city" | "province" | "phone" | "email">;
  clinicSettings: NotificationSettingsSlice;
  cancellationReason?: string | null;
  confirmationToken?: string | null;
};

export async function sendAppointmentEmail(params: SendAppointmentEmailParams): Promise<void> {
  if (!isNotificationEnabled(params.type, params.clinicSettings)) return;

  const formattedStart = formatManilaDateTime(params.startAt);
  const smsData = {
    patientName: params.patientName,
    serviceName: params.serviceName,
    doctorName: params.doctorName,
    startAt: formattedStart,
    clinicName: params.clinic.name,
    clinicPhone: params.clinic.phone,
  };

  // SMS — send in parallel with email when clinic has SMS enabled and patient has a phone number
  if (params.clinicSettings.sms_enabled && params.patientPhone) {
    let smsMessage: string;
    switch (params.type) {
      case "booking_confirmation":   smsMessage = buildBookingConfirmationSms(smsData); break;
      case "appointment_confirmed":  smsMessage = buildAppointmentConfirmedSms(smsData); break;
      case "appointment_rescheduled":smsMessage = buildAppointmentRescheduledSms(smsData); break;
      case "appointment_cancelled":  smsMessage = buildAppointmentCancelledSms(smsData, params.cancellationReason); break;
      case "appointment_reminder":   smsMessage = buildAppointmentReminderSms(smsData); break;
    }
    void sendSmsNotification({ to: params.patientPhone, message: smsMessage }).catch((err) =>
      console.error("[SMS] Failed to send:", err)
    );
  }

  if (!params.patientEmail) {
    console.warn(`[sendAppointmentEmail] No email for appointment ${params.appointmentId} — email skipped.`);
    return;
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const confirmationUrl = params.confirmationToken ? `${appUrl}/confirm/${params.confirmationToken}` : undefined;

  const clinicAddress = [params.clinic.address_line_1, params.clinic.city, params.clinic.province]
    .filter(Boolean)
    .join(", ");

  const emailData: AppointmentEmailData = {
    clinicName: params.clinic.name,
    clinicAddress: clinicAddress || "Contact the clinic for the address.",
    clinicPhone: params.clinic.phone,
    clinicEmail: params.clinic.email,
    patientName: params.patientName,
    serviceName: params.serviceName,
    doctorName: params.doctorName,
    startAt: formatManilaDateTime(params.startAt),
    endAt: formatManilaDateTime(params.endAt),
    cancellationReason: params.cancellationReason,
    confirmationUrl
  };

  let emailContent: { subject: string; html: string };
  switch (params.type) {
    case "booking_confirmation":
      emailContent = buildBookingConfirmationEmail(emailData);
      break;
    case "appointment_confirmed":
      emailContent = buildAppointmentConfirmedEmail(emailData);
      break;
    case "appointment_rescheduled":
      emailContent = buildAppointmentRescheduledEmail(emailData);
      break;
    case "appointment_cancelled":
      emailContent = buildAppointmentCancelledEmail(emailData);
      break;
    case "appointment_reminder":
      emailContent = buildAppointmentReminderEmail(emailData);
      break;
  }

  const supabase = createSupabaseAdminClient();

  const { data: notifRecord } = await supabase
    .from("appointment_notifications")
    .insert({
      clinic_id: params.clinicId,
      appointment_id: params.appointmentId,
      channel: "email",
      notification_type: params.type,
      recipient: params.patientEmail,
      status: "pending",
      metadata: {
        subject: emailContent.subject,
        patient_name: params.patientName,
        service_name: params.serviceName
      }
    })
    .select("id")
    .single<{ id: string }>();

  const sendResult = await sendResendEmail({
    to: params.patientEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    replyTo: params.clinic.email ?? undefined,
    fromName: params.clinic.name ?? undefined
  });

  if (notifRecord?.id) {
    await supabase
      .from("appointment_notifications")
      .update({
        status: sendResult.success ? "sent" : "failed",
        error: sendResult.error ?? null,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        metadata: {
          subject: emailContent.subject,
          patient_name: params.patientName,
          service_name: params.serviceName,
          message_id: sendResult.messageId ?? null
        }
      })
      .eq("id", notifRecord.id);
  }

  if (sendResult.success && params.type === "booking_confirmation") {
    await supabase
      .from("appointments")
      .update({ patient_notified_at: new Date().toISOString() })
      .eq("id", params.appointmentId);
  }
}

// Convenience function: looks up appointment + clinic + settings from DB then sends email.
// Always wraps in try/catch so email failures never surface to callers.
export async function sendAppointmentEmailById(
  appointmentId: string,
  type: AppointmentNotificationType,
  overrides?: { cancellationReason?: string | null }
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: appt } = await supabase
      .from("appointments")
      .select(
        "id, clinic_id, start_at, end_at, cancellation_reason, confirmation_token, patients(id, full_name, email, phone), services(id, name), doctors(id, full_name)"
      )
      .eq("id", appointmentId)
      .single<{
        id: string;
        clinic_id: string;
        start_at: string;
        end_at: string;
        cancellation_reason: string | null;
        confirmation_token: string | null;
        patients: { id: string; full_name: string; email: string | null; phone: string | null } | null;
        services: { id: string; name: string } | null;
        doctors: { id: string; full_name: string } | null;
      }>();

    if (!appt) return;

    const [clinicResult, settingsResult] = await Promise.all([
      supabase
        .from("clinics")
        .select("id, name, email, phone, address_line_1, city, province")
        .eq("id", appt.clinic_id)
        .single<Pick<Clinic, "id" | "name" | "email" | "phone" | "address_line_1" | "city" | "province">>(),
      supabase
        .from("clinic_settings")
        .select(
          "notify_booking_confirmation, notify_appointment_confirmed, notify_appointment_rescheduled, notify_appointment_cancelled, notify_appointment_reminder, sms_enabled, sms_provider"
        )
        .eq("clinic_id", appt.clinic_id)
        .maybeSingle<NotificationSettingsSlice>()
    ]);

    if (!clinicResult.data) return;

    await sendAppointmentEmail({
      type,
      clinicId: appt.clinic_id,
      appointmentId: appt.id,
      patientEmail: appt.patients?.email ?? null,
      patientPhone: appt.patients?.phone ?? null,
      patientName: appt.patients?.full_name ?? "Patient",
      serviceName: appt.services?.name ?? "Appointment",
      doctorName: appt.doctors?.full_name ?? null,
      startAt: appt.start_at,
      endAt: appt.end_at,
      clinic: clinicResult.data,
      clinicSettings: settingsResult.data ?? defaultNotificationSettings,
      cancellationReason: overrides?.cancellationReason ?? appt.cancellation_reason,
      confirmationToken: appt.confirmation_token
    });
  } catch (err) {
    // Email errors must never block appointment workflows, but log for visibility
    console.error("[sendAppointmentEmailById] Failed to send appointment email:", err);
  }
}
