import Link from "next/link";
import { CalendarPlus, ClipboardList } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { formatManilaDateTime, titleize } from "@/lib/utils/format";
import { getAppointmentsData } from "@/server/queries/appointments";
import type { AppointmentStatus } from "@/types/database";

export const dynamic = "force-dynamic";

function pageHref(page: number, filters: { doctorId?: string; serviceId?: string; status?: AppointmentStatus }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (filters.doctorId) params.set("doctorId", filters.doctorId);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.status) params.set("status", filters.status);
  return `/appointments?${params.toString()}`;
}

export default async function AppointmentsPage({
  searchParams
}: {
  searchParams?: Promise<{ doctorId?: string; serviceId?: string; status?: AppointmentStatus; page?: string }>;
}) {
  try {
    const params = await searchParams;
    const data = await getAppointmentsData(params);

    if (!data) {
      return <AccessCard title="Appointments unavailable" message="Sign in with a clinic account to view appointments." />;
    }

    const options = data.options;

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Scheduling"
          title="Appointments"
          description="Create, filter, and manage clinic-scoped appointments with conflict checks."
          action={data.canManage ? { href: "/appointments/new", label: "New appointment", icon: CalendarPlus } : undefined}
          icon={ClipboardList}
        />

        <Card>
          <CardContent className="p-4">
            <form className="grid gap-3 md:grid-cols-4" method="get">
              <select name="doctorId" defaultValue={data.filters.doctorId ?? ""} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
                <option value="">All doctors</option>
                {options?.doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
              <select name="serviceId" defaultValue={data.filters.serviceId ?? ""} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
                <option value="">All services</option>
                {options?.services.map((service) => (
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
          </CardContent>
        </Card>

        {data.appointments.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No appointments found" description="Create a manual appointment or adjust the filters." />
        ) : (
          <section className="space-y-3">
            {data.appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="font-semibold text-blue-600 hover:text-blue-700" href={`/appointments/${appointment.id}`}>
                        {appointment.patients?.full_name ?? "Patient"}
                      </Link>
                      <AppointmentStatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {appointment.services?.name ?? "Service"} · {appointment.doctors?.full_name ?? "No doctor assigned"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatManilaDateTime(appointment.start_at)} to {formatManilaDateTime(appointment.end_at)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/appointments/${appointment.id}`}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {data.page} of {data.totalPages} · {data.total} appointments
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(Math.max(data.page - 1, 1), data.filters)}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(Math.min(data.page + 1, data.totalPages), data.filters)}>Next</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointments.";
    return <AccessCard title="Appointments could not load" message={message} />;
  }
}
