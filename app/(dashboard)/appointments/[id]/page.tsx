import Link from "next/link";
import { CalendarClock, Pencil } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { StatusTransitionForm } from "@/components/appointments/status-transition-form";
import { SoapNoteForm } from "@/components/appointments/soap-note-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatManilaDateTime, titleize } from "@/lib/utils/format";
import { getAppointmentData } from "@/server/queries/appointments";
import { getNoteByAppointment } from "@/server/queries/notes";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [data, noteData] = await Promise.all([
      getAppointmentData(id),
      getNoteByAppointment(id),
    ]);

    if (!data) {
      return <AccessCard title="Appointment unavailable" message="Sign in with a clinic account to view this appointment." />;
    }

    const appointment = data.appointment;

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Appointments"
          title={appointment.patients?.full_name ?? "Appointment"}
          description="View appointment details and move through the supported status lifecycle."
          icon={CalendarClock}
        />
        <div className="flex flex-wrap gap-3">
          <AppointmentStatusBadge status={appointment.status} />
          {data.canManage ? (
            <Button asChild variant="outline">
              <Link href={`/appointments/${appointment.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : null}
        </div>
        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Patient" value={appointment.patients?.full_name ?? "Unknown"} />
              <Detail label="Phone" value={appointment.patients?.phone ?? "None"} />
              <Detail label="Doctor" value={appointment.doctors?.full_name ?? "No doctor"} />
              <Detail label="Service" value={appointment.services?.name ?? "Unknown"} />
              <Detail label="Start" value={formatManilaDateTime(appointment.start_at)} />
              <Detail label="End" value={formatManilaDateTime(appointment.end_at)} />
              <Detail label="Source" value={titleize(appointment.source)} />
              <Detail label="Cancellation" value={appointment.cancellation_reason ?? "None"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              {data.canManage ? <StatusTransitionForm appointmentId={appointment.id} status={appointment.status} /> : <p className="text-sm text-slate-500">Read-only access.</p>}
            </CardContent>
          </Card>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Appointment Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-600">{appointment.notes ?? "No notes recorded."}</CardContent>
        </Card>

        {noteData && (
          <Card>
            <CardHeader>
              <CardTitle>Clinical Note (SOAP)</CardTitle>
            </CardHeader>
            <CardContent>
              <SoapNoteForm
                appointmentId={appointment.id}
                patientId={appointment.patient_id}
                doctorId={appointment.doctor_id}
                note={noteData.note}
                canManage={noteData.canManage}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointment.";
    return <AccessCard title="Appointment could not load" message={message} />;
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
