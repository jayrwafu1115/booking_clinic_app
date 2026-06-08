// SMS provider type definitions.
// Implement a concrete provider when a paid SMS service is configured.

export type SmsProvider = "semaphore" | "twilio" | "infobip";

export type SmsNotificationParams = {
  to: string;
  message: string;
  provider?: SmsProvider;
};

export type SmsSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

// Interface each concrete SMS provider must satisfy.
export type SmsProviderClient = {
  readonly name: SmsProvider;
  send(params: SmsNotificationParams): Promise<SmsSendResult>;
};
