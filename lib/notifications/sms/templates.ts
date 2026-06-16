// SMS message builders — kept short (< 160 chars per segment where possible).

export type SmsAppointmentData = {
  patientName: string;
  serviceName: string;
  doctorName: string | null;
  startAt: string; // pre-formatted Manila datetime string
  clinicName: string;
  clinicPhone: string | null;
};

export function buildBookingConfirmationSms(d: SmsAppointmentData): string {
  const doctor = d.doctorName ? ` w/ ${d.doctorName}` : "";
  return `Hi ${d.patientName}, your ${d.serviceName}${doctor} at ${d.clinicName} is booked for ${d.startAt}. Questions? Call ${d.clinicPhone ?? "the clinic"}.`;
}

export function buildAppointmentConfirmedSms(d: SmsAppointmentData): string {
  const doctor = d.doctorName ? ` w/ ${d.doctorName}` : "";
  return `Hi ${d.patientName}, your ${d.serviceName}${doctor} at ${d.clinicName} on ${d.startAt} is confirmed. See you then!`;
}

export function buildAppointmentRescheduledSms(d: SmsAppointmentData): string {
  return `Hi ${d.patientName}, your appointment at ${d.clinicName} has been rescheduled to ${d.startAt}. Call ${d.clinicPhone ?? "us"} for questions.`;
}

export function buildAppointmentCancelledSms(d: SmsAppointmentData, reason?: string | null): string {
  const why = reason ? ` Reason: ${reason}.` : "";
  return `Hi ${d.patientName}, your appointment at ${d.clinicName} has been cancelled.${why} Call ${d.clinicPhone ?? "us"} to rebook.`;
}

export function buildAppointmentReminderSms(d: SmsAppointmentData): string {
  const doctor = d.doctorName ? ` w/ ${d.doctorName}` : "";
  return `Reminder: ${d.patientName}, your ${d.serviceName}${doctor} at ${d.clinicName} is on ${d.startAt}. Call ${d.clinicPhone ?? "us"} to reschedule.`;
}
