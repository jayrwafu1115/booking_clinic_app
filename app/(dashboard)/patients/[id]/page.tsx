import Link from "next/link";
import { CalendarClock, FileText, Pencil } from "lucide-react";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePatientAction } from "@/server/actions/core";
import { getPatientData } from "@/server/queries/core";
import { formatManilaDate, formatManilaDateTime, titleize } from "@/lib/utils/format";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked:      "bg-blue-50 text-blue-700",
  confirmed:   "bg-indigo-50 text-indigo-700",
  checked_in:  "bg-purple-50 text-purple-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  completed:   "bg-green-50 text-green-700",
  cancelled:   "bg-slate-100 text-slate-500",
  no_show:     "bg-red-50 text-red-600",
};

function AppointmentRow({ appt }: { appt: AppointmentWithRelations }) {
  const label = appt.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {appt.services?.name ?? "Unknown service"}
        </p>
        <p className="text-xs text-slate-500">
          {formatManilaDateTime(appt.start_at)}
          {appt.doctors ? ` · ${appt.doctors.full_name}` : ""}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[appt.status]}`}>
        {label}
      </span>
    </div>
  );
}

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getPatientData(id);

    if (!data) {
      return <AccessCard title="Patient unavailable" message="Sign in with a clinic account to view this record." />;
    }

    const { patient, appointments } = data;

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Patients" title={patient.full_name} description="Patient profile and appointment history." />
        <div className="flex flex-col gap-3 sm:flex-row">
          {data.canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/patients/${patient.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit patient
                </Link>
              </Button>
              <ConfirmActionForm
                action={deletePatientAction}
                id={patient.id}
                label="Delete patient"
                confirmMessage="Delete this patient record? This cannot be undone."
              />
            </>
          ) : null}
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Contact & Demographics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Phone" value={patient.phone} />
              <Detail label="Email" value={patient.email ?? "None"} />
              <Detail label="Birth date" value={formatManilaDate(patient.birth_date)} />
              <Detail label="Gender" value={patient.gender ? titleize(patient.gender) : "Not set"} />
              <Detail label="Emergency contact" value={patient.emergency_contact_name ?? "Not set"} />
              <Detail label="Emergency phone" value={patient.emergency_contact_phone ?? "Not set"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{patient.address_line_1 ?? "No address line 1"}</p>
              <p>{patient.address_line_2 ?? "No address line 2"}</p>
              <p>{[patient.barangay, patient.city, patient.province, patient.region, patient.postal_code].filter(Boolean).join(", ") || "No locality set"}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-blue-600" />
                Appointment History
                {appointments.length > 0 && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {appointments.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500">No appointments on record.</p>
              ) : (
                <div>
                  {appointments.map((appt) => (
                    <AppointmentRow key={appt.id} appt={appt} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Medical / Treatment Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600">
              {patient.notes ?? <span className="text-slate-400">No notes recorded.</span>}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load patient.";
    return <AccessCard title="Patient could not load" message={message} />;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
