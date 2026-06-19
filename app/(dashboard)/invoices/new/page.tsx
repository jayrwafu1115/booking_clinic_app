import { FileText } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";
import type { Patient, Service } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams?: Promise<{ patientId?: string }>;
}) {
  const { patientId } = (await searchParams) ?? {};
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="New Invoice" message="Sign in to create invoices." />;
  if (!profileHasPermission(profile, "invoices:manage")) return <AccessCard title="New Invoice" message="You do not have permission to create invoices." />;

  const supabase = await createSupabaseServerClient();
  const [{ data: patients }, { data: services }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("clinic_id", profile.clinic_id)
      .order("full_name")
      .returns<Pick<Patient, "id" | "full_name" | "phone">[]>(),
    supabase
      .from("services")
      .select("id, name, price_centavos")
      .eq("clinic_id", profile.clinic_id)
      .eq("active", true)
      .order("name")
      .returns<Pick<Service, "id" | "name" | "price_centavos">[]>(),
  ]);

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Billing" title="New Invoice" description="Create a new invoice for a patient." icon={FileText} />
      <NewInvoiceForm patients={patients ?? []} services={services ?? []} defaultPatientId={patientId} />
    </div>
  );
}
