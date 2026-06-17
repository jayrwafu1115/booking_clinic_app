"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_COUNTRY, DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugifyClinicName } from "@/lib/tenant/slug";
import { sendResendEmail } from "@/lib/notifications/resend";
import { acceptInviteSchema, forgotPasswordSchema, loginSchema, magicLinkSchema, registerSchema } from "@/lib/validations/auth";

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

  // Create the user and obtain a one-time confirmation link in a single call.
  // Using generateLink instead of createUser so we control the email ourselves
  // via Resend and the user must verify before logging in.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${appUrl()}/dashboard`,
      data: {
        full_name: fullName,
        clinic_id: clinic.id
      }
    }
  });

  if (linkError || !linkData.user) {
    return { message: linkError?.message ?? "Could not create account." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: linkData.user.id,
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

  const confirmLink = linkData.properties?.action_link;
  if (confirmLink) {
    await sendResendEmail({
      to: email,
      subject: "Confirm your Book Clinic PH account",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
          <h2 style="margin-bottom:8px;">Welcome to Book Clinic PH, ${fullName}!</h2>
          <p style="color:#475569;">Your clinic workspace <strong>${clinicName}</strong> is ready. Click the button below to confirm your email and activate your account.</p>
          <a href="${confirmLink}"
             style="display:inline-block;margin:24px 0;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Confirm my account
          </a>
          <p style="font-size:13px;color:#94a3b8;">This link expires in 24 hours. If you did not sign up for Book Clinic PH, you can safely ignore this email.</p>
        </div>
      `
    });
  }

  return {
    success: true,
    message: `We've sent a confirmation link to ${email}. Check your inbox to activate your account.`
  };
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

export async function acceptInviteAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = acceptInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: parsed.error.errors[0]?.message ?? "Please complete all required fields." };
  }

  const { token, email, fullName, phone, password } = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("user_invites")
    .select("*")
    .eq("token", token)
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) {
    return { message: "This invite link is invalid or has already been used." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { message: "This invite has expired. Ask the clinic owner to resend it." };
  }

  const { data: existing } = await admin.auth.admin.listUsers();
  const alreadyExists = existing?.users?.some((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (alreadyExists) {
    return { message: "An account with this email already exists. Please sign in instead." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, clinic_id: invite.clinic_id }
  });

  if (createError || !created.user) {
    return { message: createError?.message ?? "Could not create account." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    clinic_id: invite.clinic_id,
    role: invite.role,
    full_name: fullName,
    email: email.toLowerCase(),
    phone: phone || null
  });

  if (profileError) {
    return { message: profileError.message };
  }

  const { error: acceptError } = await admin
    .from("user_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  if (acceptError) {
    return { message: acceptError.message };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
