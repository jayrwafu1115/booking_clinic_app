import { Star, CheckCircle, XCircle } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FeedbackForm } from "@/components/feedback/feedback-form";

type Props = { params: Promise<{ token: string }> };

type FeedbackRow = {
  id: string;
  token: string;
  rating: number | null;
  submitted_at: string | null;
  clinic_id: string;
  appointment_id: string;
  appointments: {
    services: { name: string } | null;
    clinics: { name: string } | null;
    patients: { full_name: string } | null;
  } | null;
};

export default async function FeedbackPage({ params }: Props) {
  const { token } = await params;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("patient_feedback")
    .select("id, token, rating, submitted_at, clinic_id, appointment_id, appointments(services(name), clinics(name), patients(full_name))")
    .eq("token", token)
    .maybeSingle<FeedbackRow>();

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-lg font-semibold text-slate-900">Invalid feedback link</h1>
          <p className="mt-2 text-sm text-slate-500">This link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  if (data.submitted_at) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="text-lg font-semibold text-slate-900">Thank you for your feedback!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your {data.rating ? `${data.rating}-star` : ""} rating has been recorded.
          </p>
        </div>
      </main>
    );
  }

  const clinicName = data.appointments?.clinics?.name ?? "Your Clinic";
  const serviceName = data.appointments?.services?.name ?? "your appointment";
  const patientName = data.appointments?.patients?.full_name ?? "there";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
          <h1 className="text-xl font-bold text-slate-900">How was your visit?</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hi {patientName} — rate your {serviceName} at <strong>{clinicName}</strong>
          </p>
        </div>
        <FeedbackForm feedbackId={data.id} />
        <p className="text-center text-xs text-slate-400">Book Clinic PH — powered by your clinic</p>
      </div>
    </main>
  );
}
