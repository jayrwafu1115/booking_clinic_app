import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { titleize } from "@/lib/utils/format";
import { getCalendarAppointmentsData } from "@/server/queries/appointments";
import type { AppointmentStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<{ doctorId?: string; serviceId?: string; status?: AppointmentStatus }>;
}) {
  try {
    const params = await searchParams;
    const data = await getCalendarAppointmentsData(params);

    if (!data) {
      return <AccessCard title="Calendar unavailable" message="Sign in with a clinic account to view the calendar." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Scheduling" title="Calendar" description="FullCalendar day, week, month, and agenda views with drag-to-reschedule validation." />
        <form className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-4" method="get">
          <select name="doctorId" defaultValue={data.filters.doctorId ?? ""} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
            <option value="">All doctors</option>
            {data.options?.doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.full_name}
              </option>
            ))}
          </select>
          <select name="serviceId" defaultValue={data.filters.serviceId ?? ""} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
            <option value="">All services</option>
            {data.options?.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={data.filters.status ?? ""} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {titleize(status)}
              </option>
            ))}
          </select>
          <Button type="submit">Apply filters</Button>
        </form>
        <AppointmentCalendar appointments={data.appointments} canManage={data.canManage} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load calendar.";
    return <AccessCard title="Calendar could not load" message={message} />;
  }
}
