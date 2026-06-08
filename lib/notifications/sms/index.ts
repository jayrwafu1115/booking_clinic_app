// SMS notification placeholder — not yet connected to a paid provider.
//
// TODO: Implement SMS sending for Philippine clinics.
//
// Supported providers (pick one and configure env vars):
//
//   Semaphore (PH-local, recommended for Philippine numbers):
//     SEMAPHORE_API_KEY
//     SEMAPHORE_SENDER_NAME   (optional, default "SEMAPHORE")
//
//   Twilio:
//     TWILIO_ACCOUNT_SID
//     TWILIO_AUTH_TOKEN
//     TWILIO_FROM_PHONE       (e.g. "+1234567890")
//
//   Infobip:
//     INFOBIP_BASE_URL        (e.g. "https://XXXXX.api.infobip.com")
//     INFOBIP_API_KEY
//     INFOBIP_SENDER          (sender ID or phone number)
//
// Select the active provider via clinic_settings.sms_provider once implemented.
// Enable SMS per clinic via clinic_settings.sms_enabled.

import type { SmsNotificationParams, SmsSendResult } from "./types";

export async function sendSmsNotification(params: SmsNotificationParams): Promise<SmsSendResult> {
  // eslint-disable-next-line no-console
  console.warn("[SMS] SMS notifications are not yet implemented. Recipient:", params.to);
  return { success: false, error: "SMS provider not configured." };
}

export type { SmsProvider, SmsNotificationParams, SmsSendResult, SmsProviderClient } from "./types";
