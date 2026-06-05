import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const magicLinkSchema = z.object({
  email: z.string().email()
});

export const registerSchema = z.object({
  clinicName: z.string().min(2).max(120),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});
