import { z } from "zod";
import { AI_PROVIDERS, AI_TONES } from "@/lib/constants/ai";
import { ASSIGNABLE_USER_ROLES, CLINIC_TYPES, DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants/app";

const optionalText = z.string().trim().optional().transform((value) => value || null);

export const clinicProfileSchema = z.object({
  clinicId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  clinicType: z.enum(CLINIC_TYPES),
  email: z.string().trim().email().optional().or(z.literal("")).transform((value) => value || null),
  phone: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  barangay: optionalText,
  city: optionalText,
  province: optionalText,
  region: optionalText,
  postalCode: optionalText,
  logoUrl: optionalText,
  primaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  prcNumber: optionalText,
  ptrNumber: optionalText,
  tin: optionalText,
  philhealthAccreditationNo: optionalText,
  timezone: z.literal(DEFAULT_TIMEZONE),
  currency: z.literal(DEFAULT_CURRENCY)
});

export const inviteUserSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(ASSIGNABLE_USER_ROLES)
});

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ASSIGNABLE_USER_ROLES)
});

export const deactivateUserSchema = z.object({
  userId: z.string().uuid()
});

export const aiSettingsSchema = z.object({
  aiEnabled: z.enum(["on"]).optional().transform((value) => value === "on"),
  aiProvider: z.enum(AI_PROVIDERS),
  aiModel: z.string().trim().min(1).max(80),
  aiTone: z.enum(AI_TONES),
  aiWelcomeMessage: z.string().trim().min(3).max(500),
  aiBookingInstructions: optionalText,
  aiWidgetEnabled: z.enum(["on"]).optional().transform((value) => value === "on")
});

export const faqItemSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(3).max(2000),
  active: z.enum(["on"]).optional().transform((value) => value === "on")
});

export const faqItemDeleteSchema = z.object({
  id: z.string().uuid()
});

export const createConversationSchema = z.object({
  channel: z.enum(["widget", "dashboard", "facebook", "whatsapp", "sms"]).default("dashboard")
});

export const sendAiMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000)
});

export const handoffConversationSchema = z.object({
  conversationId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500)
});
