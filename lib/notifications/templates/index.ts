// Server-only: email template builders for appointment notifications.
// All templates return plain HTML strings — no React Email dependency required.

export type AppointmentEmailData = {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string | null;
  clinicEmail: string | null;
  patientName: string;
  serviceName: string;
  doctorName: string | null;
  startAt: string;
  endAt: string;
  cancellationReason?: string | null;
  confirmationUrl?: string;
};

// ─── Shared layout ───────────────────────────────────────────────────────────

function layout(title: string, previewText: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1d4ed8;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Book Clinic PH</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated message from <strong>Book Clinic PH</strong>.<br/>
                Please do not reply to this email. Contact the clinic directly for changes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(patientName: string): string {
  return `<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Hi <strong>${patientName}</strong>,</p>`;
}

function appointmentCard(data: AppointmentEmailData): string {
  const rows = [
    ["Service", data.serviceName],
    data.doctorName ? ["Doctor", data.doctorName] : null,
    ["Date &amp; Time", data.startAt],
  ].filter(Boolean) as [string, string][];

  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:36%;vertical-align:top;">${label}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:13px;vertical-align:top;">${value}</td>
        </tr>`
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <thead>
        <tr style="background-color:#eff6ff;">
          <th colspan="2" style="padding:12px 16px;text-align:left;color:#1d4ed8;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Appointment Details</th>
        </tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>`;
}

function clinicCard(data: AppointmentEmailData): string {
  const lines = [
    `<strong style="color:#1e293b;">${data.clinicName}</strong>`,
    data.clinicAddress,
    data.clinicPhone ? `📞 ${data.clinicPhone}` : null,
    data.clinicEmail ? `✉️ ${data.clinicEmail}` : null,
  ]
    .filter(Boolean)
    .join("<br/>");

  return `
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Clinic Contact</p>
      <p style="margin:0;color:#475569;font-size:13px;line-height:1.7;">${lines}</p>
    </div>`;
}

function ctaButton(url: string, label: string): string {
  return `
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;background-color:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px;">${label}</a>
    </div>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function buildBookingConfirmationEmail(data: AppointmentEmailData): { subject: string; html: string } {
  const subject = `Appointment Confirmed – ${data.serviceName} at ${data.clinicName}`;
  const body = `
    ${greeting(data.patientName)}
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      Your appointment has been successfully booked. Here are your booking details:
    </p>
    ${appointmentCard(data)}
    ${data.confirmationUrl ? ctaButton(data.confirmationUrl, "View My Appointment") : ""}
    ${clinicCard(data)}
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
      If you need to reschedule or cancel, please contact the clinic directly or use the link above.
    </p>`;

  return { subject, html: layout(subject, `Your ${data.serviceName} appointment is confirmed.`, body) };
}

export function buildAppointmentConfirmedEmail(data: AppointmentEmailData): { subject: string; html: string } {
  const subject = `Appointment Confirmed by Clinic – ${data.clinicName}`;
  const body = `
    ${greeting(data.patientName)}
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      The clinic has confirmed your upcoming appointment. We look forward to seeing you!
    </p>
    ${appointmentCard(data)}
    ${data.confirmationUrl ? ctaButton(data.confirmationUrl, "View My Appointment") : ""}
    ${clinicCard(data)}`;

  return { subject, html: layout(subject, `Your appointment at ${data.clinicName} is confirmed.`, body) };
}

export function buildAppointmentRescheduledEmail(data: AppointmentEmailData): { subject: string; html: string } {
  const subject = `Appointment Rescheduled – ${data.serviceName} at ${data.clinicName}`;
  const body = `
    ${greeting(data.patientName)}
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      Your appointment has been rescheduled. Please review your updated booking details below:
    </p>
    ${appointmentCard(data)}
    ${data.confirmationUrl ? ctaButton(data.confirmationUrl, "View My Appointment") : ""}
    ${clinicCard(data)}
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
      If this reschedule was unexpected or you have questions, please contact the clinic directly.
    </p>`;

  return { subject, html: layout(subject, `Your appointment at ${data.clinicName} has been rescheduled.`, body) };
}

export function buildAppointmentCancelledEmail(data: AppointmentEmailData): { subject: string; html: string } {
  const subject = `Appointment Cancelled – ${data.serviceName} at ${data.clinicName}`;
  const reasonSection = data.cancellationReason
    ? `<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
         <p style="margin:0 0 4px;color:#b91c1c;font-size:12px;font-weight:600;text-transform:uppercase;">Cancellation Reason</p>
         <p style="margin:0;color:#7f1d1d;font-size:14px;">${data.cancellationReason}</p>
       </div>`
    : "";

  const body = `
    ${greeting(data.patientName)}
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      Your appointment has been cancelled. Details of the cancelled appointment are below.
    </p>
    ${reasonSection}
    ${appointmentCard(data)}
    ${clinicCard(data)}
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
      To book a new appointment, please visit the clinic website or contact us directly.
    </p>`;

  return { subject, html: layout(subject, `Your appointment at ${data.clinicName} has been cancelled.`, body) };
}

export function buildAppointmentReminderEmail(data: AppointmentEmailData): { subject: string; html: string } {
  const subject = `Appointment Reminder – ${data.serviceName} at ${data.clinicName}`;
  const body = `
    ${greeting(data.patientName)}
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      This is a friendly reminder about your upcoming appointment. We look forward to seeing you!
    </p>
    ${appointmentCard(data)}
    ${data.confirmationUrl ? ctaButton(data.confirmationUrl, "View My Appointment") : ""}
    ${clinicCard(data)}
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
      If you need to cancel or reschedule, please contact the clinic as soon as possible.
    </p>`;

  return { subject, html: layout(subject, `Reminder: Your ${data.serviceName} appointment is coming up.`, body) };
}
