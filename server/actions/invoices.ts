"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";
import { getNextInvoiceNumber } from "@/server/queries/invoices";

type InvoiceActionState = { message?: string; success?: boolean };

const itemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  unitPricePesos: z.coerce.number().min(0).transform((v) => Math.round(v * 100)),
});

const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  notes: z.string().trim().optional().transform((v) => v || null),
  dueDate: z.string().optional().transform((v) => v || null),
  discountPesos: z.coerce.number().min(0).default(0).transform((v) => Math.round(v * 100)),
});

async function getInvoiceContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("No clinic profile.");
  assertPermission(profile, "invoices:manage");
  return { user, profile, clinicId: profile.clinic_id };
}

export async function createInvoiceAction(_: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = createInvoiceSchema.safeParse(raw);
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid invoice data." };

    const { user, clinicId } = await getInvoiceContext();
    const invoiceNumber = await getNextInvoiceNumber(clinicId);

    // Parse line items from indexed fields: item_description_0, item_quantity_0, item_unitPricePesos_0
    const items: z.infer<typeof itemSchema>[] = [];
    let i = 0;
    while (formData.get(`item_description_${i}`) !== null) {
      const item = itemSchema.safeParse({
        description: formData.get(`item_description_${i}`),
        quantity: formData.get(`item_quantity_${i}`),
        unitPricePesos: formData.get(`item_unitPricePesos_${i}`),
      });
      if (item.success) items.push(item.data);
      i++;
    }

    if (items.length === 0) return { message: "Add at least one line item." };

    const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPricePesos, 0);
    const total = Math.max(0, subtotal - parsed.data.discountPesos);

    const supabase = await createSupabaseServerClient();
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .insert({
        clinic_id: clinicId,
        patient_id: parsed.data.patientId,
        appointment_id: parsed.data.appointmentId,
        invoice_number: invoiceNumber,
        status: "draft",
        subtotal_centavos: subtotal,
        discount_centavos: parsed.data.discountPesos,
        total_centavos: total,
        notes: parsed.data.notes,
        due_date: parsed.data.dueDate,
        created_by: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (invError || !invoice) return { message: invError?.message ?? "Could not create invoice." };

    await supabase.from("invoice_items").insert(
      items.map((it) => ({
        invoice_id: invoice.id,
        clinic_id: clinicId,
        description: it.description,
        quantity: it.quantity,
        unit_price_centavos: it.unitPricePesos,
        total_centavos: it.quantity * it.unitPricePesos,
      }))
    );

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "invoice.created",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { invoice_number: invoiceNumber, total_centavos: total },
    });

    revalidatePath("/invoices");
    redirect(`/invoices/${invoice.id}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function recordPaymentAction(_: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  try {
    const schema = z.object({
      invoiceId: z.string().uuid(),
      patientId: z.string().uuid(),
      amountPesos: z.coerce.number().positive().transform((v) => Math.round(v * 100)),
      method: z.enum(["cash", "gcash", "card", "bank_transfer", "philhealth", "hmo"]),
      referenceNo: z.string().trim().optional().transform((v) => v || null),
      notes: z.string().trim().optional().transform((v) => v || null),
    });

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid payment data." };

    const { user, clinicId } = await getInvoiceContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("payments").insert({
      clinic_id: clinicId,
      invoice_id: parsed.data.invoiceId,
      patient_id: parsed.data.patientId,
      amount_centavos: parsed.data.amountPesos,
      method: parsed.data.method,
      reference_no: parsed.data.referenceNo,
      notes: parsed.data.notes,
      recorded_by: user.id,
    });

    if (error) return { message: error.message };

    // Mark invoice as paid
    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.invoiceId);

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "payment.recorded",
      entityType: "invoice",
      entityId: parsed.data.invoiceId,
      metadata: { amount_centavos: parsed.data.amountPesos, method: parsed.data.method },
    });

    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
    return { success: true, message: "Payment recorded. Invoice marked as paid." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateInvoiceStatusAction(_: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  try {
    const schema = z.object({
      invoiceId: z.string().uuid(),
      status: z.enum(["draft", "sent", "void"]),
    });
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: "Invalid status." };

    const { user, clinicId } = await getInvoiceContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("invoices")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.invoiceId);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "invoice.status_changed",
      entityType: "invoice",
      entityId: parsed.data.invoiceId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
    return { success: true, message: `Invoice marked as ${parsed.data.status}.` };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
