import Link from "next/link";
import { ArrowLeft, Pencil, Stethoscope } from "lucide-react";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { IcalCopyButton } from "@/components/doctors/ical-copy-button";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { deactivateDoctorAction } from "@/server/actions/core";
import { getDoctorData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function DoctorViewPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getDoctorData(id);

    if (!data || !data.doctor) {
      return <AccessCard title="Doctor not found" message="This doctor record does not exist or you do not have access." />;
    }

    const doctor = data.doctor;

    return (
      <div className="space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2">
            <Link href="/doctors">
              <ArrowLeft className="h-4 w-4" />
              Back to Doctors
            </Link>
          </Button>
          {data.canManage && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/doctors/${doctor.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <ConfirmActionForm
                action={deactivateDoctorAction}
                id={doctor.id}
                label="Deactivate"
                confirmMessage="Deactivate this doctor? Existing future scheduling rules may no longer be used."
                disabled={!doctor.active}
              />
            </div>
          )}
        </div>

        {/* Profile header */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50">
            <Stethoscope className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950">{doctor.full_name}</h1>
              <span className={doctor.active
                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
              }>
                {doctor.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-slate-500">{doctor.specialization ?? "No specialization set"}</p>
          </div>
        </div>

        {/* Details card */}
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b border-border bg-slate-50/60 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile Details</p>
          </div>
          <div className="divide-y divide-border">
            <DetailRow label="Email" value={doctor.email ?? "—"} />
            <DetailRow label="Phone" value={doctor.phone ?? "—"} />
            <DetailRow label="License No." value={doctor.license_no ?? "—"} />
            <DetailRow label="Specialization" value={doctor.specialization ?? "—"} />
          </div>
        </div>

        {/* iCal */}
        {doctor.ical_token && (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border bg-slate-50/60 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Calendar Feed</p>
            </div>
            <div className="px-5 py-4">
              <p className="mb-3 text-sm text-slate-500">
                Subscribe to this doctor&apos;s appointment calendar in any iCal-compatible app.
              </p>
              <IcalCopyButton token={doctor.ical_token} />
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load doctor.";
    return <AccessCard title="Doctor could not load" message={message} />;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-6 px-5 py-3.5">
      <span className="w-36 flex-shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
