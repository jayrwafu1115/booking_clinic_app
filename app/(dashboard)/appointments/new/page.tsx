import { AppointmentForm } from "@/components/appointments/appointment-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getAppointmentOptions } from "@/server/queries/appointments";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  try {
    const data = await getAppointmentOptions();

    if (!data || !data.canManage) {
      return <AccessCard title="Appointment creation unavailable" message="Your current role cannot create appointments." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Appointments" title="New Appointment" description="Create a manual booking with conflict, availability, and blocked-date validation." />
        <AppointmentForm patients={data.patients} doctors={data.doctors} services={data.services} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointment form.";
    return <AccessCard title="Appointment form could not load" message={message} />;
  }
}
