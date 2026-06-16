import { ClipboardCheck } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { FormTemplateBuilder } from "@/components/forms/form-template-builder";

export const dynamic = "force-dynamic";

export default async function NewFormPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="New Form" message="Sign in to create forms." />;
  if (!profileHasPermission(profile, "forms:manage")) return <AccessCard title="New Form" message="You do not have permission to create forms." />;

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Clinical" title="New Intake Form" description="Build a custom intake form template." icon={ClipboardCheck} />
      <FormTemplateBuilder />
    </div>
  );
}
