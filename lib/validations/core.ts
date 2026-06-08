import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || null);
const optionalEmail = z.string().trim().email().optional().or(z.literal("")).transform((value) => value || null);
const optionalUuid = z.string().uuid().optional().or(z.literal("")).transform((value) => value || null);
const optionalDate = z.string().optional().or(z.literal("")).transform((value) => value || null);
const optionalTime = z.string().optional().or(z.literal("")).transform((value) => value || null);

export const patientSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2).max(160),
  email: optionalEmail,
  phone: z.string().trim().min(5).max(40),
  birthDate: optionalDate,
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().or(z.literal("")).transform((value) => value || null),
  addressLine1: optionalText,
  addressLine2: optionalText,
  barangay: optionalText,
  city: optionalText,
  province: optionalText,
  region: optionalText,
  postalCode: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  notes: optionalText
});

export const patientDeleteSchema = z.object({
  id: z.string().uuid()
});

export const doctorSchema = z.object({
  id: z.string().uuid().optional(),
  profileId: optionalUuid,
  fullName: z.string().trim().min(2).max(160),
  specialization: optionalText,
  licenseNo: optionalText,
  email: optionalEmail,
  phone: optionalText,
  avatarUrl: optionalText,
  active: z.enum(["on"]).optional().transform((value) => value === "on")
});

export const doctorDeactivateSchema = z.object({
  id: z.string().uuid()
});

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  description: optionalText,
  category: optionalText,
  durationMinutes: z.coerce.number().int().positive().max(1440),
  pricePesos: z.coerce.number().min(0).max(999999).transform((value) => Math.round(value * 100)),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: optionalText,
  onlineBookingEnabled: z.enum(["on"]).optional().transform((value) => value === "on"),
  active: z.enum(["on"]).optional().transform((value) => value === "on")
});

export const serviceDeactivateSchema = z.object({
  id: z.string().uuid()
});

export const availabilityRuleFormSchema = z.object({
  doctorId: optionalUuid,
  rules: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        isOpen: z.enum(["on"]).optional().transform((value) => value === "on"),
        openTime: optionalTime,
        closeTime: optionalTime,
        breakStart: optionalTime,
        breakEnd: optionalTime,
        slotIntervalMinutes: z.coerce.number().int().positive().max(240)
      })
    )
    .length(7)
});

export const blockedDateSchema = z
  .object({
    doctorId: optionalUuid,
    title: z.string().trim().min(2).max(160),
    reason: optionalText,
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    allDay: z.enum(["on"]).optional().transform((value) => value === "on")
  })
  .refine((data) => new Date(data.endAt).getTime() > new Date(data.startAt).getTime(), {
    message: "End must be after start.",
    path: ["endAt"]
  });

export const blockedDateDeleteSchema = z.object({
  id: z.string().uuid()
});
