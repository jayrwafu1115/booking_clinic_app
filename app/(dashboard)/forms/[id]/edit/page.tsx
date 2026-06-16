import { ClipboardCheck } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { FormTemplateBuilder } from "@/components/forms/form-template-builder";
import type { FormTemplate } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Edit Form" message="Sign in to edit forms." />;
  if (!profileHasPermission(profile, "forms:manage")) return <AccessCard title="Edit Form" message="You do not have permission to edit forms." />;

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: template } = await supabase
    .from("form_templates")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .eq("id", id)
    .single<FormTemplate>();

  if (!template) return <AccessCard title="Edit Form" message="Form not found." />;

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Clinical" title={`Edit: ${template.name}`} description="Modify form fields and settings." icon={ClipboardCheck} />
      <FormTemplateBuilder template={template} />
    </div>
  );
}
