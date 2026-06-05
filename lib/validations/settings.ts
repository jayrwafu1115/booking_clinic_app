import { z } from "zod";
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
