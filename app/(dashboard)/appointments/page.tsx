import Link from "next/link";
import { CalendarPlus, ChevronRight, ClipboardList } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { formatManilaDate, formatManilaDateTime, titleize } from "@/lib/utils/format";
import { getAppointmentsData } from "@/server/queries/appointments";
import type { AppointmentStatus } from "@/types/database";

export const dynamic = "force-dynamic";

type Filters = {
  doctorId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
};

function pageHref(page: number, filters: Filters) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (filters.doctorId)  params.set("doctorId",  filters.doctorId);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.status)    params.set("status",    filters.status);
  if (filters.dateFrom)  params.set("dateFrom",  filters.dateFrom);
  if (filters.dateTo)    params.set("dateTo",    filters.dateTo);
  return `/appointments?${params.toString()}`;
}

function hasActiveFilters(filters: Filters) {
  return !!(filters.doctorId || filters.serviceId || filters.status || filters.dateFrom || filters.dateTo);
}


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

    const options = data.options;
    const filters = data.filters;
    const activeFilters = hasActiveFilters(filters);

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Scheduling"
          title="Appointments"
          description="Create, filter, and manage clinic-scoped appointments with conflict checks."
          action={data.canManage ? { href: "/appointments/new", label: "New appointment", icon: CalendarPlus } : undefined}
          icon={ClipboardList}
        />

        {/* Filter bar */}
        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">From</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom ?? ""}
              className="text-sm text-slate-900 outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 h-10">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">To</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo ?? ""}
              className="text-sm text-slate-900 outline-none bg-transparent"
            />
          </div>
          <select
            name="doctorId"
            defaultValue={filters.doctorId ?? ""}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All doctors</option>
            {options?.doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>
            ))}
          </select>
          <select
            name="serviceId"
            defaultValue={filters.serviceId ?? ""}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All services</option>
            {options?.services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{titleize(status)}</option>
            ))}
          </select>
          <Button type="submit" size="sm">Apply</Button>
          {activeFilters && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/appointments">Clear filters</Link>
            </Button>
          )}
        </form>

        {/* Active filter summary */}
        {activeFilters && (
          <p className="text-sm text-slate-500">
            Showing filtered results ·{" "}
            <Link href="/appointments" className="text-blue-600 hover:underline">clear all</Link>
          </p>
        )}

        {data.appointments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No appointments found"
            description={activeFilters ? "No appointments match the current filters." : "Create a manual appointment to get started."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date &amp; Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="w-8 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="group border-b border-border last:border-0 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900 tabular-nums">
                          {formatManilaDate(appt.start_at)}
                        </p>
                        <p className="text-xs text-slate-400 tabular-nums">
                          {formatManilaDateTime(appt.start_at).split(",")[1]?.trim() ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/appointments/${appt.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {appt.patients?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3.5 md:table-cell">
                        <div className="flex items-center gap-2">
                          {appt.services?.color && (
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: appt.services.color }}
                            />
                          )}
                          <span className="text-slate-600">{appt.services?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 text-slate-500 lg:table-cell">
                        {appt.doctors?.full_name ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <AppointmentStatusBadge status={appt.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/appointments/${appt.id}`}>
                          <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="flex items-center justify-between border-t border-border bg-slate-50/40 px-4 py-2.5">
              <p className="text-xs text-slate-400">
                Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} appointments
                {filters.dateFrom && filters.dateTo && (
                  <> · {formatManilaDate(filters.dateFrom + "T00:00:00Z")} – {formatManilaDate(filters.dateTo + "T00:00:00Z")}</>
                )}
              </p>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Link href={pageHref(Math.max(data.page - 1, 1), filters)}>‹</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Link href={pageHref(Math.min(data.page + 1, data.totalPages), filters)}>›</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointments.";
    return <AccessCard title="Appointments could not load" message={message} />;
  }
}
