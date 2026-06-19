import { FileText } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { InvoiceTemplateSelector } from "@/components/invoices/invoice-template-selector";
import type { Clinic, ClinicSettings } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function InvoiceTemplatesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Invoice Templates" message="Sign in to manage invoice templates." />;
  if (!profileHasPermission(profile, "invoices:manage")) return <AccessCard title="Invoice Templates" message="You do not have permission to manage invoice templates." />;

  const supabase = await createSupabaseServerClient();
  const [{ data: settings }, { data: clinic }] = await Promise.all([
    supabase
      .from("clinic_settings")
      .select("invoice_template, invoice_accent_color, invoice_header_note, invoice_footer_note")
      .eq("clinic_id", profile.clinic_id)
      .maybeSingle<Pick<ClinicSettings, "invoice_template" | "invoice_accent_color" | "invoice_header_note" | "invoice_footer_note">>(),
    supabase
      .from("clinics")
      .select("primary_color")
      .eq("id", profile.clinic_id)
      .single<Pick<Clinic, "primary_color">>(),
  ]);

  // Effective color: saved override → clinic primary → sensible fallback
  const clinicPrimary = clinic?.primary_color ?? "#2563eb";

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Finance"
        title="Invoice Templates"
        description="Choose a print layout and customize the accent color, header, and footer text for all invoices."
        icon={FileText}
      />
      <InvoiceTemplateSelector
        current={settings?.invoice_template ?? "classic"}
        accentColor={settings?.invoice_accent_color ?? null}
        clinicPrimary={clinicPrimary}
        headerNote={settings?.invoice_header_note ?? null}
        footerNote={settings?.invoice_footer_note ?? "Thank you for your business!"}
      />
    </div>
  );
}
