"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";

type ActionState = { message?: string; success?: boolean };

const schema = z.object({
  invoice_template: z.enum(["classic", "modern", "minimal"]),
  invoice_accent_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().transform((v) => v || null),
  invoice_header_note: z.string().trim().max(300).optional().transform((v) => v || null),
  invoice_footer_note: z.string().trim().max(300).optional().transform((v) => v || null),
});

export async function updateInvoiceTemplateAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) return { message: "No clinic profile." };
    assertPermission(profile, "invoices:manage");

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid data." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("clinic_settings")
      .upsert(
        {
          clinic_id: profile.clinic_id,
          invoice_template: parsed.data.invoice_template,
          invoice_accent_color: parsed.data.invoice_accent_color,
          invoice_header_note: parsed.data.invoice_header_note,
          invoice_footer_note: parsed.data.invoice_footer_note,
        },
        { onConflict: "clinic_id" }
      );

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: "clinic_settings.invoice_template_updated",
      entityType: "clinic_settings",
      entityId: profile.clinic_id,
      metadata: { template: parsed.data.invoice_template },
    });

    revalidatePath("/settings/invoice-templates");
    return { success: true, message: "Invoice template saved." };
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Unexpected error." };
  }
}
