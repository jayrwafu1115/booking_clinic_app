"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/server/audit/create-audit-log";
import type { FormField } from "@/types/database";

type FormActionState = { message?: string; success?: boolean };

const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "textarea", "select", "radio", "checkbox", "date", "number"]),
  label: z.string().trim().min(1),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().optional().transform((v) => v || null),
  fields: z.string().transform((v) => {
    try { return JSON.parse(v) as FormField[]; }
    catch { return [] as FormField[]; }
  }),
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
});

async function getFormContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("No clinic profile.");
  assertPermission(profile, "forms:manage");
  return { user, profile, clinicId: profile.clinic_id };
}

export async function upsertFormTemplateAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  try {
    const parsed = templateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid template." };

    const { user, clinicId } = await getFormContext();
    const supabase = await createSupabaseServerClient();

    const payload = {
      clinic_id: clinicId,
      name: parsed.data.name,
      description: parsed.data.description,
      fields: parsed.data.fields,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = parsed.data.id
      ? await supabase.from("form_templates").update(payload).eq("clinic_id", clinicId).eq("id", parsed.data.id).select("id").single<{ id: string }>()
      : await supabase.from("form_templates").insert(payload).select("id").single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not save template." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: parsed.data.id ? "form_template.updated" : "form_template.created",
      entityType: "form_template",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/forms");
    return { success: true, message: "Form template saved." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function sendFormLinkAction(_: FormActionState, formData: FormData): Promise<FormActionState & { token?: string }> {
  try {
    const schema = z.object({
      templateId: z.string().uuid(),
      patientId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
      appointmentId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
    });

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: "Invalid data." };

    const { user, clinicId } = await getFormContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("form_submissions")
      .insert({
        clinic_id: clinicId,
        template_id: parsed.data.templateId,
        patient_id: parsed.data.patientId,
        appointment_id: parsed.data.appointmentId,
      })
      .select("token")
      .single<{ token: string }>();

    if (error || !data) return { message: error?.message ?? "Could not create form link." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "form.link_created",
      entityType: "form_submission",
      entityId: null,
      metadata: { template_id: parsed.data.templateId, patient_id: parsed.data.patientId },
    });

    revalidatePath("/forms");
    return { success: true, message: "Form link created.", token: data.token };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

// Public action — no auth check, uses token
export async function submitIntakeFormAction(
  _: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const token = z.string().uuid().parse(formData.get("token"));

    // Get submission record
    const supabase = createSupabaseAdminClient();
    const { data: submission } = await supabase
      .from("form_submissions")
      .select("id, submitted_at, template_id, clinic_id")
      .eq("token", token)
      .single<{ id: string; submitted_at: string | null; template_id: string; clinic_id: string }>();

    if (!submission) return { message: "Form link not found or has expired." };
    if (submission.submitted_at) return { message: "This form has already been submitted." };

    // Collect all answers from formData
    const answers: Record<string, string | string[]> = {};
    for (const [key, value] of formData.entries()) {
      if (key === "token") continue;
      if (key.endsWith("[]")) {
        const k = key.slice(0, -2);
        const existing = answers[k];
        answers[k] = Array.isArray(existing) ? [...existing, String(value)] : [String(value)];
      } else {
        answers[key] = String(value);
      }
    }

    const { error } = await supabase
      .from("form_submissions")
      .update({ answers, submitted_at: new Date().toISOString() })
      .eq("id", submission.id);

    if (error) return { message: error.message };

    return { success: true, message: "Thank you! Your form has been submitted." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
