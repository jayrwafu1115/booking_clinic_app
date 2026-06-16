import Link from "next/link";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SendFormLinkButton } from "@/components/forms/send-form-link-button";
import type { FormSubmission, FormTemplate, Patient } from "@/types/database";

export const dynamic = "force-dynamic";

type SubmissionRow = FormSubmission & { patients: Pick<Patient, "id" | "full_name"> | null };

export default async function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Submissions" message="Sign in with a clinic account." />;
  if (!profileHasPermission(profile, "forms:view")) return <AccessCard title="Submissions" message="You do not have permission." />;

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [tplResult, subsResult, patientsResult] = await Promise.all([
    supabase.from("form_templates").select("*").eq("clinic_id", profile.clinic_id).eq("id", id).single<FormTemplate>(),
    supabase.from("form_submissions").select("*, patients(id, full_name)").eq("clinic_id", profile.clinic_id).eq("template_id", id).order("created_at", { ascending: false }).returns<SubmissionRow[]>(),
    supabase.from("patients").select("id, full_name").eq("clinic_id", profile.clinic_id).order("full_name").returns<Pick<Patient, "id" | "full_name">[]>(),
  ]);

  if (!tplResult.data) return <AccessCard title="Submissions" message="Form template not found." />;

  const template = tplResult.data;
  const submissions = subsResult.data ?? [];
  const patients = patientsResult.data ?? [];
  const canManage = profileHasPermission(profile, "forms:manage");

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Clinical"
        title={`${template.name} — Submissions`}
        description={`${submissions.length} total · ${submissions.filter((s) => s.submitted_at).length} completed`}
        icon={ClipboardCheck}
      />

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Send Form Link</CardTitle></CardHeader>
          <CardContent>
            <SendFormLinkButton templateId={template.id} patients={patients} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sent</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {submissions.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No submissions yet.</td></tr>
              ) : submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{sub.patients?.full_name ?? "Anonymous"}</td>
                  <td className="px-5 py-3">
                    {sub.submitted_at ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(sub.created_at).toLocaleDateString("en-PH")}</td>
                  <td className="px-5 py-3 text-slate-500">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("en-PH") : "—"}</td>
                  <td className="px-5 py-3">
                    {sub.submitted_at && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/forms/${template.id}/submissions/${sub.id}`}>View</Link>
                      </Button>
                    )}
                    {!sub.submitted_at && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/intake/${sub.token}`} target="_blank" rel="noopener noreferrer" className="gap-1">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Link
                        </a>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
