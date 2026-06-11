"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission, isAssignableRole } from "@/lib/auth/permissions";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { sendResendEmail } from "@/lib/notifications/resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clinicProfileSchema, deactivateUserSchema, inviteUserSchema, notificationPreferencesSchema, updateUserRoleSchema } from "@/lib/validations/settings";
import { createAuditLog } from "@/server/audit/create-audit-log";
import type { Clinic, Profile, UserInvite } from "@/types/database";

type SettingsActionState = {
  message?: string;
  success?: boolean;
};

async function getOwnerContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile?.clinic_id) {
    throw new Error("A clinic profile is required.");
  }

  assertPermission(profile, "team:invite");

  return { user, profile, clinicId: profile.clinic_id };
}

async function getClinicSettingsOwnerContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile?.clinic_id) {
    throw new Error("A clinic profile is required.");
  }

  assertPermission(profile, "clinic_settings:update");

  return { user, profile, clinicId: profile.clinic_id };
}

function toState(error: unknown): SettingsActionState {
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong." };
}

export async function updateClinicProfileAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const parsed = clinicProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the clinic settings form." };
    }

    const { user, clinicId } = await getClinicSettingsOwnerContext();

    if (parsed.data.clinicId !== clinicId) {
      return { message: "You can only update your own clinic." };
    }

    const supabase = await createSupabaseServerClient();
    const { error: clinicError } = await supabase
      .from("clinics")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address_line_1: parsed.data.addressLine1,
        address_line_2: parsed.data.addressLine2,
        barangay: parsed.data.barangay,
        city: parsed.data.city,
        province: parsed.data.province,
        region: parsed.data.region,
        postal_code: parsed.data.postalCode,
        logo_url: parsed.data.logoUrl,
        primary_color: parsed.data.primaryColor,
        timezone: DEFAULT_TIMEZONE,
        country: "Philippines"
      })
      .eq("id", clinicId);

    if (clinicError) {
      return { message: clinicError.message };
    }

    const { error: settingsError } = await supabase.from("clinic_settings").upsert(
      {
        clinic_id: clinicId,
        clinic_type: parsed.data.clinicType,
        prc_number: parsed.data.prcNumber,
        ptr_number: parsed.data.ptrNumber,
        tin: parsed.data.tin,
        philhealth_accreditation_no: parsed.data.philhealthAccreditationNo,
        timezone: parsed.data.timezone,
        default_currency: parsed.data.currency
      },
      { onConflict: "clinic_id" }
    );

    if (settingsError) {
      return { message: settingsError.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "clinic_settings.updated",
      entityType: "clinic",
      entityId: clinicId,
      metadata: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        clinic_type: parsed.data.clinicType
      }
    });

    revalidatePath("/settings/clinic");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "Clinic settings updated." };
  } catch (error) {
    return toState(error);
  }
}

export async function inviteUserAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const parsed = inviteUserSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Enter a valid invite." };
    }

    const { user, clinicId } = await getOwnerContext();
    const supabase = await createSupabaseServerClient();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("user_invites").insert({
      clinic_id: clinicId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      token,
      status: "pending",
      invited_by: user.id,
      expires_at: expiresAt
    });

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "user.invited",
      entityType: "user_invite",
      metadata: {
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        expires_at: expiresAt
      }
    });

    const { data: clinic } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", clinicId)
      .single<Pick<Clinic, "name">>();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/register?token=${token}&email=${encodeURIComponent(parsed.data.email.toLowerCase())}`;
    const clinicName = clinic?.name ?? "ClinicFlow AI PH";
    const roleName = parsed.data.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    await sendResendEmail({
      to: parsed.data.email,
      subject: `You've been invited to join ${clinicName} on ClinicFlow AI PH`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
          <h2 style="margin:0 0 8px;font-size:20px">You're invited to ${clinicName}</h2>
          <p style="margin:0 0 24px;color:#475569">
            You have been invited to join <strong>${clinicName}</strong> as a
            <strong>${roleName}</strong> on ClinicFlow AI PH.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">
            Accept Invitation
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
            This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
          </p>
        </div>
      `
    });

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "Invite created and email sent." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateUserRoleAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const parsed = updateUserRoleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success || !isAssignableRole(parsed.success ? parsed.data.role : "")) {
      return { message: "Choose a valid clinic role." };
    }

    const { user, clinicId } = await getOwnerContext();
    const supabase = await createSupabaseServerClient();

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", parsed.data.userId)
      .eq("clinic_id", clinicId)
      .single<Profile>();

    if (targetError || !target) {
      return { message: targetError?.message ?? "User not found." };
    }

    if (target.role === "super_admin") {
      return { message: "Super admin is not assignable by clinic owners." };
    }

    if (target.id === user.id && parsed.data.role !== "clinic_owner") {
      return { message: "You cannot remove your own clinic owner role." };
    }

    const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", target.id).eq("clinic_id", clinicId);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "user.role_changed",
      entityType: "profile",
      entityId: target.id,
      metadata: {
        email: target.email,
        previous_role: target.role,
        new_role: parsed.data.role
      }
    });

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "User role updated." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateNotificationPreferencesAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const parsed = notificationPreferencesSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the notification settings." };
    }

    const { user, clinicId } = await getClinicSettingsOwnerContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("clinic_settings").upsert(
      {
        clinic_id: clinicId,
        notify_booking_confirmation: parsed.data.notifyBookingConfirmation,
        notify_appointment_confirmed: parsed.data.notifyAppointmentConfirmed,
        notify_appointment_rescheduled: parsed.data.notifyAppointmentRescheduled,
        notify_appointment_cancelled: parsed.data.notifyAppointmentCancelled,
        notify_appointment_reminder: parsed.data.notifyAppointmentReminder,
        reminder_hours_before: parsed.data.reminderHoursBefore,
        sms_enabled: parsed.data.smsEnabled,
        sms_provider: parsed.data.smsProvider
      },
      { onConflict: "clinic_id" }
    );

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "clinic_settings.notifications_updated",
      entityType: "clinic_settings",
      entityId: clinicId,
      metadata: {
        notify_booking_confirmation: parsed.data.notifyBookingConfirmation,
        notify_appointment_reminder: parsed.data.notifyAppointmentReminder,
        sms_enabled: parsed.data.smsEnabled
      }
    });

    revalidatePath("/settings/notifications");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "Notification preferences updated." };
  } catch (error) {
    return toState(error);
  }
}

export async function deactivateUserAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const parsed = deactivateUserSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid user." };
    }

    const { user, clinicId } = await getOwnerContext();
    if (parsed.data.userId === user.id) {
      return { message: "You cannot deactivate your own account." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", parsed.data.userId)
      .eq("clinic_id", clinicId)
      .single<Profile>();

    if (targetError || !target) {
      return { message: targetError?.message ?? "User not found." };
    }

    if (target.role === "super_admin") {
      return { message: "Super admin accounts cannot be deactivated by clinic owners." };
    }

    const deactivatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "inactive",
        deactivated_at: deactivatedAt,
        deactivated_by: user.id
      })
      .eq("id", target.id)
      .eq("clinic_id", clinicId);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "user.deactivated",
      entityType: "profile",
      entityId: target.id,
      metadata: {
        email: target.email,
        role: target.role,
        deactivated_at: deactivatedAt
      }
    });

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "User deactivated." };
  } catch (error) {
    return toState(error);
  }
}

export async function cancelInviteAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const inviteId = formData.get("id");
    if (!inviteId || typeof inviteId !== "string") {
      return { message: "Invalid invite." };
    }

    const { user, clinicId } = await getOwnerContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("user_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId)
      .eq("clinic_id", clinicId)
      .eq("status", "pending");

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "user_invite.cancelled",
      entityType: "user_invite",
      entityId: inviteId
    });

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "Invite cancelled." };
  } catch (error) {
    return toState(error);
  }
}

export async function resendInviteAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const inviteId = formData.get("id");
    if (!inviteId || typeof inviteId !== "string") {
      return { message: "Invalid invite." };
    }

    const { user, clinicId } = await getOwnerContext();
    const supabase = await createSupabaseServerClient();

    const { data: invite, error: fetchError } = await supabase
      .from("user_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("clinic_id", clinicId)
      .single<UserInvite>();

    if (fetchError || !invite) {
      return { message: fetchError?.message ?? "Invite not found." };
    }

    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("user_invites")
      .update({ token: newToken, expires_at: newExpiresAt, status: "pending" })
      .eq("id", inviteId)
      .eq("clinic_id", clinicId);

    if (updateError) {
      return { message: updateError.message };
    }

    const { data: clinic } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", clinicId)
      .single<Pick<Clinic, "name">>();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/register?token=${newToken}&email=${encodeURIComponent(invite.email)}`;
    const clinicName = clinic?.name ?? "ClinicFlow AI PH";
    const roleName = invite.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    await sendResendEmail({
      to: invite.email,
      subject: `Reminder: You've been invited to join ${clinicName} on ClinicFlow AI PH`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
          <h2 style="margin:0 0 8px;font-size:20px">Reminder: You're invited to ${clinicName}</h2>
          <p style="margin:0 0 24px;color:#475569">
            This is a reminder that you have been invited to join <strong>${clinicName}</strong> as a
            <strong>${roleName}</strong> on ClinicFlow AI PH.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">
            Accept Invitation
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
            This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
          </p>
        </div>
      `
    });

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "user_invite.resent",
      entityType: "user_invite",
      entityId: inviteId,
      metadata: { email: invite.email, role: invite.role }
    });

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: "Invite resent." };
  } catch (error) {
    return toState(error);
  }
}
