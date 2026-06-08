import Link from "next/link";
import { CalendarClock, FileText, Pencil } from "lucide-react";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePatientAction } from "@/server/actions/core";
import { getPatientData } from "@/server/queries/core";
import { formatManilaDate, titleize } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getPatientData(id);

    if (!data) {
      return <AccessCard title="Patient unavailable" message="Sign in with a clinic account to view this record." />;
    }

    const patient = data.patient;

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Patients" title={patient.full_name} description="Patient profile and future appointment history workspace." />
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
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600">Appointment history will appear here once scheduling is implemented.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Medical / Treatment Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600">{patient.notes ?? "Treatment notes workspace placeholder."}</CardContent>
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
