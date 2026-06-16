// Server-only: creates a feedback record and sends a post-visit rating email.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "./resend";

export async function createFeedbackRequest(appointmentId: string, clinicId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  // Look up appointment + patient + clinic
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, patients(full_name, email), services(name), clinics(name, email)")
    .eq("id", appointmentId)
    .maybeSingle<{
      id: string;
      patients: { full_name: string; email: string | null } | null;
      services: { name: string } | null;
      clinics: { name: string; email: string | null } | null;
    }>();

  if (!appt?.patients?.email) return;

  const token = crypto.randomUUID();

  // Create feedback record (idempotent via unique constraint on appointment_id)
  const { error: insertError } = await supabase
    .from("patient_feedback")
    .insert({ clinic_id: clinicId, appointment_id: appointmentId, patient_id: null, token });

  if (insertError) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const feedbackUrl = `${appUrl}/feedback/${token}`;
  const clinicName = appt.clinics?.name ?? "Your Clinic";
  const serviceName = appt.services?.name ?? "appointment";
  const patientName = appt.patients.full_name;

  await sendResendEmail({
    to: appt.patients.email,
    subject: `How was your ${serviceName} at ${clinicName}?`,
    fromName: clinicName,
    replyTo: appt.clinics?.email ?? undefined,
    html: buildFeedbackEmail({ patientName, clinicName, serviceName, feedbackUrl }),
  });
}

function buildFeedbackEmail(d: {
  patientName: string;
  clinicName: string;
  serviceName: string;
  feedbackUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#1d4ed8;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Book Clinic PH</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">How was your visit?</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;">
            <p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Hi <strong>${d.patientName}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
              Thank you for your ${d.serviceName} at <strong>${d.clinicName}</strong>. We'd love to hear how it went — it only takes 30 seconds.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${d.feedbackUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;">
                Rate My Visit ★
              </a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
              This link is unique to your visit and expires in 30 days.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">Automated message from Book Clinic PH. Do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
