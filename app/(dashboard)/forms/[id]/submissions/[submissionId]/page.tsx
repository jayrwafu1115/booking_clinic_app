import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/forms/print-button";
import type { FormField, FormSubmission, FormTemplate, Patient } from "@/types/database";

export const dynamic = "force-dynamic";

type SubmissionRow = FormSubmission & { patients: Pick<Patient, "id" | "full_name"> | null };

function AnswerValue({ field, answers }: { field: FormField; answers: Record<string, string | string[]> }) {
  const value = answers[field.id];
  if (value === undefined || value === null || value === "") {
    return <span className="text-slate-400 italic">No answer</span>;
  }
  if (Array.isArray(value)) {
    return <span>{value.join(", ")}</span>;
  }
  return <span>{value}</span>;
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Submission" message="Sign in with a clinic account." />;
  if (!profileHasPermission(profile, "forms:view")) return <AccessCard title="Submission" message="You do not have permission." />;

  const { id, submissionId } = await params;
  const supabase = await createSupabaseServerClient();

  const [tplResult, subResult] = await Promise.all([
    supabase
      .from("form_templates")
      .select("*")
      .eq("clinic_id", profile.clinic_id)
      .eq("id", id)
      .single<FormTemplate>(),
    supabase
      .from("form_submissions")
      .select("*, patients(id, full_name)")
      .eq("clinic_id", profile.clinic_id)
      .eq("id", submissionId)
      .single<SubmissionRow>(),
  ]);

  if (!tplResult.data) return <AccessCard title="Submission" message="Form template not found." />;
  if (!subResult.data) return <AccessCard title="Submission" message="Submission not found." />;

  const template = tplResult.data;
  const submission = subResult.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="print:hidden">
          <Link href={`/forms/${id}/submissions`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to submissions
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Intake Form</p>
          <h1 className="text-2xl font-bold text-slate-950">{template.name}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</p>
            <p className="mt-1 font-medium text-slate-900">{submission.patients?.full_name ?? "Anonymous"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
            <p className="mt-1">
              {submission.submitted_at ? (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Completed</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Pending</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sent</p>
            <p className="mt-1 text-slate-700">{new Date(submission.created_at).toLocaleDateString("en-PH", { dateStyle: "long" })}</p>
          </div>
          {submission.submitted_at && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Submitted</p>
              <p className="mt-1 text-slate-700">{new Date(submission.submitted_at).toLocaleDateString("en-PH", { dateStyle: "long" })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answers</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {template.fields.length === 0 && (
            <p className="py-4 text-sm text-slate-400">This form has no fields.</p>
          )}
          {template.fields.map((field) => (
            <div key={field.id} className="py-4 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold text-slate-500">
                {field.label}
                {field.required && <span className="ml-1 text-red-400">*</span>}
              </p>
              <p className="mt-1 text-sm text-slate-900">
                <AnswerValue field={field} answers={submission.answers} />
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
