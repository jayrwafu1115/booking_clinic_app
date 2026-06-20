import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getCalendarAppointmentsData } from "@/server/queries/appointments";
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  try {
    const data = await getCalendarAppointmentsData();

    if (!data) {
      return <AccessCard title="Calendar unavailable" message="Sign in with a clinic account to view the calendar." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Scheduling" title="Calendar" description="Browse appointments by day with a mini month picker. Click any appointment to edit." />
        <AppointmentCalendar appointments={data.appointments} options={data.options} canManage={data.canManage} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load calendar.";
    return <AccessCard title="Calendar could not load" message={message} />;
  }
}
