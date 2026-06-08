import { Ban, CalendarCheck, CalendarClock, CircleDollarSign, Users, UserX } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatManilaDateTime, formatPesoFromCentavos } from "@/lib/utils/format";
import type { DashboardMetrics } from "@/server/queries/dashboard";
import { StatCard } from "./stat-card";

const emptyMetrics: DashboardMetrics = {
  appointmentsToday: 0,
  upcomingAppointments: 0,
  totalPatients: 0,
  revenueThisMonthCentavos: 0,
  noShowRate: 0,
  cancellationRate: 0,
  todayAppointments: []
};

export function DashboardOverview({ metrics = emptyMetrics }: { metrics?: DashboardMetrics | null }) {
  const resolvedMetrics = metrics ?? emptyMetrics;
  const stats = [
    { label: "Appointments Today", value: String(resolvedMetrics.appointmentsToday), detail: "Asia/Manila calendar day", icon: CalendarCheck },
    { label: "Upcoming", value: String(resolvedMetrics.upcomingAppointments), detail: "Next 7 days, excluding cancelled", icon: CalendarClock },
    { label: "Total Patients", value: String(resolvedMetrics.totalPatients), detail: "Clinic-scoped patient records", icon: Users },
    {
      label: "Revenue This Month",
      value: formatPesoFromCentavos(resolvedMetrics.revenueThisMonthCentavos),
      detail: "Completed appointment services",
      icon: CircleDollarSign
    },
    { label: "No Show Rate", value: `${resolvedMetrics.noShowRate}%`, detail: "This Manila month", icon: UserX },
    { label: "Cancellation Rate", value: `${resolvedMetrics.cancellationRate}%`, detail: "This Manila month", icon: Ban }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Asia/Manila workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Dashboard</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Live clinic metrics from tenant-scoped patients and appointments.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s clinic flow</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedMetrics.todayAppointments.length === 0 ? (
              <p className="text-sm leading-6 text-slate-600">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-4">
                {resolvedMetrics.todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{appointment.patients?.full_name ?? "Patient"}</p>
                      <p className="text-xs text-slate-500">
                        {appointment.services?.name ?? "Service"} · {formatManilaDateTime(appointment.start_at)}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operational Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">Booking validation active</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Manual appointments use doctor conflict checks, service duration, availability rules, and blocked dates.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-2xl font-semibold text-slate-950">{resolvedMetrics.todayAppointments.length}</p>
                <p className="text-sm text-slate-500">Shown today</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-2xl font-semibold text-slate-950">{resolvedMetrics.upcomingAppointments}</p>
                <p className="text-sm text-slate-500">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
