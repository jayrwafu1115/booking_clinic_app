"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentEmailById } from "@/lib/notifications/send-appointment-email";

type ActionResult = { success: boolean; message: string };

const CANCELLABLE_STATUSES = ["booked", "confirmed", "checked_in"];

export async function patientConfirmAppointmentAction(token: string): Promise<ActionResult> {
  const supabase = createSupabaseAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("confirmation_token", token)
    .maybeSingle<{ id: string; status: string }>();

  if (!appt) return { success: false, message: "Appointment not found." };
  if (appt.status === "confirmed") return { success: true, message: "Your appointment is already confirmed." };
  if (appt.status !== "booked") return { success: false, message: "This appointment cannot be confirmed at this time." };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appt.id);

  if (error) return { success: false, message: "Failed to confirm. Please try again or contact the clinic." };

  void sendAppointmentEmailById(appt.id, "appointment_confirmed").catch(() => {});

  return { success: true, message: "Your appointment has been confirmed. See you soon!" };
}

export async function patientCancelAppointmentAction(token: string, reason?: string): Promise<ActionResult> {
  const supabase = createSupabaseAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("confirmation_token", token)
    .maybeSingle<{ id: string; status: string }>();

  if (!appt) return { success: false, message: "Appointment not found." };
  if (appt.status === "cancelled") return { success: true, message: "This appointment is already cancelled." };
  if (!CANCELLABLE_STATUSES.includes(appt.status)) {
    return { success: false, message: "This appointment cannot be cancelled at this time. Please contact the clinic." };
  }

  const cancellationReason = reason?.trim() || "Cancelled by patient";

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancellation_reason: cancellationReason })
    .eq("id", appt.id);

  if (error) return { success: false, message: "Failed to cancel. Please try again or contact the clinic." };

  void sendAppointmentEmailById(appt.id, "appointment_cancelled", { cancellationReason }).catch(() => {});

  return { success: true, message: "Your appointment has been cancelled. Contact the clinic to rebook." };
}
