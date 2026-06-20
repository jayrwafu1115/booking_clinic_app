"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, ClipboardList, Pencil } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { AppointmentDrawer } from "@/components/appointments/appointment-drawer";
import { EmptyState } from "@/components/core/empty-state";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { formatManilaDate, formatManilaDateTime, titleize } from "@/lib/utils/format";
import type { AppointmentFilters, AppointmentOptions } from "@/server/queries/appointments";
import type { AppointmentWithRelations } from "@/types/database";

interface AppointmentsClientProps {
  appointments: AppointmentWithRelations[];
  options: AppointmentOptions;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters: AppointmentFilters;
  canManage: boolean;
}

function pageHref(page: number, filters: AppointmentFilters) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (filters.doctorId)  params.set("doctorId",  filters.doctorId);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.status)    params.set("status",    filters.status);
  if (filters.dateFrom)  params.set("dateFrom",  filters.dateFrom);
  if (filters.dateTo)    params.set("dateTo",    filters.dateTo);
  return `/appointments?${params.toString()}`;
}

function hasActiveFilters(filters: AppointmentFilters) {
  return !!(filters.doctorId || filters.serviceId || filters.status || filters.dateFrom || filters.dateTo);
}

export function AppointmentsClient({
  appointments,
  options,
  page,
  total,
  totalPages,
  filters,
  canManage
}: AppointmentsClientProps) {
  const router = useRouter();
  const activeFilters = hasActiveFilters(filters);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAppointment, setDrawerAppointment] = useState<AppointmentWithRelations | undefined>(undefined);

  function openNewDrawer() {
    setDrawerAppointment(undefined);
    setDrawerOpen(true);
  }

  function openEditDrawer(appt: AppointmentWithRelations) {
    setDrawerAppointment(appt);
    setDrawerOpen(true);
  }

  function handleDrawerSuccess() {
    setDrawerOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-2xl bg-blue-50 p-3 text-blue-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Scheduling</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Appointments</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create, filter, and manage clinic-scoped appointments with conflict checks.
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openNewDrawer} className="gap-2 flex-shrink-0 self-start sm:self-auto">
            <CalendarPlus className="h-4 w-4" />
            New appointment
          </Button>
        )}
      </div>

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

      {activeFilters && (
        <p className="text-sm text-slate-500">
          Showing filtered results ·{" "}
          <Link href="/appointments" className="text-blue-600 hover:underline">clear all</Link>
        </p>
      )}

      {appointments.length === 0 ? (
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
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
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
                      <span className="font-medium text-slate-900">
                        {appt.patients?.full_name ?? "—"}
                      </span>
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
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openEditDrawer(appt)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Edit appointment"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-slate-50/40 px-4 py-2.5">
            <p className="text-xs text-slate-400">
              Page {page} of {totalPages} · {total.toLocaleString()} appointments
              {filters.dateFrom && filters.dateTo && (
                <> · {formatManilaDate(filters.dateFrom + "T00:00:00Z")} – {formatManilaDate(filters.dateTo + "T00:00:00Z")}</>
              )}
            </p>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Link href={pageHref(Math.max(page - 1, 1), filters)}>‹</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Link href={pageHref(Math.min(page + 1, totalPages), filters)}>›</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <AppointmentDrawer
          appointment={drawerAppointment}
          patients={options.patients}
          doctors={options.doctors}
          services={options.services}
          canManage={canManage}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleDrawerSuccess}
        />
      )}
    </div>
  );
}
