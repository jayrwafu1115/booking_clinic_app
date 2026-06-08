import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getClinicDetailsAdmin } from "@/server/queries/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminClinicStatusForm } from "@/components/admin/clinic-status-form";

export default async function AdminClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const { id } = await params;
  const details = await getClinicDetailsAdmin(id);
  if (!details?.clinic) notFound();

  const { clinic, subscription, settings } = details;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clinics" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Clinics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-800">{clinic.name}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-950">{clinic.name}</h1>
        <p className="mt-1 text-sm text-slate-500">slug: {clinic.slug}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "ID", value: clinic.id },
              { label: "Email", value: clinic.email ?? "—" },
              { label: "Status", value: clinic.status },
              { label: "Created", value: new Date(clinic.created_at).toLocaleDateString("en-PH") }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription ? (
              <>
                {[
                  { label: "Status", value: subscription.status },
                  { label: "Plan", value: (subscription as { subscription_plans?: { name: string } | null }).subscription_plans?.name ?? "—" },
                  { label: "Trial ends", value: subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString("en-PH") : "—" },
                  { label: "Period start", value: subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString("en-PH") : "—" },
                  { label: "Period end", value: subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-PH") : "—" }
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{row.label}</span>
                    <span className="font-medium text-slate-800">{row.value}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-slate-400">No subscription found</p>
            )}
          </CardContent>
        </Card>

        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Clinic type", value: settings.clinic_type },
                { label: "AI enabled", value: settings.ai_enabled ? "Yes" : "No" },
                { label: "Widget enabled", value: settings.ai_widget_enabled ? "Yes" : "No" }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{row.label}</span>
                  <span className="font-medium text-slate-800">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage Status</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminClinicStatusForm clinicId={clinic.id} currentStatus={clinic.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
