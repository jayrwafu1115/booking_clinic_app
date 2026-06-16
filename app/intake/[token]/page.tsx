import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { IntakeFormRenderer } from "@/components/forms/intake-form-renderer";
import type { FormField, FormTemplate } from "@/types/database";

export const dynamic = "force-dynamic";

type SubmissionData = {
  id: string;
  submitted_at: string | null;
  template_id: string;
  clinic_id: string;
};

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: submission } = await supabase
    .from("form_submissions")
    .select("id, submitted_at, template_id, clinic_id")
    .eq("token", token)
    .maybeSingle<SubmissionData>();

  if (!submission) {
    return <ErrorPage message="This form link is invalid or has expired." />;
  }

  if (submission.submitted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <p className="text-2xl font-bold text-emerald-600">Already submitted ✓</p>
          <p className="mt-2 text-sm text-slate-500">This form was already submitted. Thank you!</p>
        </div>
      </div>
    );
  }

  const { data: template } = await supabase
    .from("form_templates")
    .select("*")
    .eq("id", submission.template_id)
    .single<FormTemplate>();

  if (!template) {
    return <ErrorPage message="Form template not found." />;
  }

  // Get clinic name
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, logo_url")
    .eq("id", submission.clinic_id)
    .single<{ name: string; logo_url: string | null }>();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-xl space-y-6">
        {clinic && (
          <div className="text-center">
            {clinic.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinic.logo_url} alt={clinic.name} className="mx-auto mb-3 h-14 w-14 rounded-xl object-cover" />
            )}
            <p className="text-sm font-semibold text-slate-500">{clinic.name}</p>
          </div>
        )}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
          {template.description && <p className="mt-1 text-sm text-slate-500">{template.description}</p>}
        </div>
        <IntakeFormRenderer token={token} fields={template.fields} />
      </div>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
        <p className="text-lg font-bold text-slate-800">Form unavailable</p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
