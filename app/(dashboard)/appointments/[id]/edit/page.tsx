import { AppointmentForm } from "@/components/appointments/appointment-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getAppointmentData } from "@/server/queries/appointments";

export const dynamic = "force-dynamic";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getAppointmentData(id);

    if (!data || !data.canManage || !data.options) {
      return <AccessCard title="Edit unavailable" message="Your current role cannot edit this appointment." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Appointments" title="Edit Appointment" description="Update booking details with the same conflict checks used for new appointments." />
        <AppointmentForm appointment={data.appointment} patients={data.options.patients} doctors={data.options.doctors} services={data.options.services} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointment.";
    return <AccessCard title="Appointment could not load" message={message} />;
  }
}
