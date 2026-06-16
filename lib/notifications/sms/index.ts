// Server-only: SMS notifications via Semaphore (Philippine SMS provider).
// Semaphore docs: https://semaphore.co/docs
//
// Configure in .env:
//   SEMAPHORE_API_KEY=your_key_here
//   SEMAPHORE_SENDER_NAME=BOOKCLINIC   (max 11 chars, no spaces)
//
// Enable SMS per clinic via Settings > Notifications > SMS provider = semaphore.

import type { SmsNotificationParams, SmsSendResult } from "./types";

const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";

export async function sendSmsNotification(params: SmsNotificationParams): Promise<SmsSendResult> {
  const apiKey = process.env.SEMAPHORE_API_KEY;

  if (!apiKey) {
    console.warn("[SMS] SEMAPHORE_API_KEY not configured. Skipping SMS to:", params.to);
    return { success: false, error: "SEMAPHORE_API_KEY not configured." };
  }

  // Normalise Philippine mobile number to 09XXXXXXXXX format accepted by Semaphore.
  const to = normalizePhNumber(params.to);
  if (!to) {
    return { success: false, error: `Invalid PH phone number: ${params.to}` };
  }

  const senderName = (process.env.SEMAPHORE_SENDER_NAME ?? "BOOKCLINIC").slice(0, 11);

  try {
    const body = new URLSearchParams({
      apikey: apiKey,
      number: to,
      message: params.message,
      sendername: senderName,
    });

    const res = await fetch(SEMAPHORE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Semaphore API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as Array<{ message_id?: string; status?: string }>;
    const first = Array.isArray(data) ? data[0] : null;

    if (first?.status === "Pending" || first?.status === "Queued" || first?.message_id) {
      return { success: true, messageId: String(first.message_id ?? "") };
    }

    return { success: false, error: "Unexpected Semaphore response: " + JSON.stringify(data) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "SMS send failed.",
    };
  }
}

function normalizePhNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return "0" + digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits;
  if (digits.length === 10 && digits.startsWith("9")) return "0" + digits;
  return null;
}

export type { SmsProvider, SmsNotificationParams, SmsSendResult, SmsProviderClient } from "./types";
