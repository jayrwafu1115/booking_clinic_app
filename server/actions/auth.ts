"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_COUNTRY, DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugifyClinicName } from "@/lib/tenant/slug";
import { forgotPasswordSchema, loginSchema, magicLinkSchema, registerSchema } from "@/lib/validations/auth";

type AuthState = {
  message?: string;
  success?: boolean;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Enter a valid email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Please complete all required fields." };
  }

  const { clinicName, fullName, email, phone, password } = parsed.data;
  const admin = createSupabaseAdminClient();
  const slug = slugifyClinicName(clinicName);

  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .insert({
      name: clinicName,
      slug,
      email,
      phone: phone || null,
      country: DEFAULT_COUNTRY,
      timezone: DEFAULT_TIMEZONE
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    return { message: clinicError?.message ?? "Could not create clinic." };
  }

  const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      clinic_id: clinic.id
    }
  });

  if (userError || !createdUser.user) {
    return { message: userError?.message ?? "Could not create account." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: createdUser.user.id,
    clinic_id: clinic.id,
    role: "clinic_owner",
    full_name: fullName,
    email,
    phone: phone || null
  });

  if (profileError) {
    return { message: profileError.message };
  }

  await admin.from("clinic_settings").insert({
    clinic_id: clinic.id,
    timezone: DEFAULT_TIMEZONE,
    default_currency: "PHP"
  });

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({ email, password });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function magicLinkAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appUrl()}/dashboard`
    }
  });

  if (error) {
    return { message: error.message };
  }

  return { success: true, message: "Magic link sent. Check your inbox." };
}

export async function forgotPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/login`
  });

  if (error) {
    return { message: error.message };
  }

  return { success: true, message: "Password reset email sent." };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
