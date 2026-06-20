import { AppointmentsClient } from "@/components/appointments/appointments-client";
import { AccessCard } from "@/components/settings/access-card";
import { getAppointmentsData } from "@/server/queries/appointments";
import type { AppointmentStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams
}: {
  searchParams?: Promise<{
    doctorId?: string;
    serviceId?: string;
    status?: AppointmentStatus;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  try {
    const params = await searchParams;
    const data = await getAppointmentsData(params);

    if (!data) {
      return <AccessCard title="Appointments unavailable" message="Sign in with a clinic account to view appointments." />;
    }

    return (
      <AppointmentsClient
        appointments={data.appointments}
        options={data.options ?? { patients: [], doctors: [], services: [] }}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        filters={data.filters}
        canManage={data.canManage}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointments.";
    return <AccessCard title="Appointments could not load" message={message} />;
  }
}
