import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { EmptyState } from "@/components/core/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FormTemplate } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Intake Forms" message="Sign in with a clinic account." />;
  if (!profileHasPermission(profile, "forms:view")) return <AccessCard title="Intake Forms" message="You do not have permission to view intake forms." />;

  const supabase = await createSupabaseServerClient();
  const { data: templates } = await supabase
    .from("form_templates")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .order("name")
    .returns<FormTemplate[]>();

  const canManage = profileHasPermission(profile, "forms:manage");

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Clinical"
        title="Intake Forms"
        description="Build digital intake form templates and send links to patients."
        icon={ClipboardCheck}
        action={canManage ? { href: "/forms/new", label: "New form", icon: Plus } : undefined}
      />

      {(templates ?? []).length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No forms yet" description="Create your first intake form template." />
      ) : (
        <div className="space-y-3">
          {(templates ?? []).map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{tpl.name}</p>
                    {tpl.active ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
                    )}
                  </div>
                  {tpl.description && <p className="mt-0.5 text-sm text-slate-500">{tpl.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">{tpl.fields.length} field{tpl.fields.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/forms/${tpl.id}/submissions`}>Submissions</Link>
                  </Button>
                  {canManage && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/forms/${tpl.id}/edit`}>Edit</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
