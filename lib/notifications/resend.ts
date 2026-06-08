// Server-only: never import this file from client components.
import { Resend } from "resend";

export type ResendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type ResendSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendResendEmail(payload: ResendEmailPayload): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "ClinicFlow AI PH <notifications@clinicflowaiph.com>";

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured." };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Email send failed."
    };
  }
}
