import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Activity,
  Bot,
  CalendarCheck,
  CalendarX,
  TrendingUp,
  Users,
  UserCheck,
  Wallet,
  Zap
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { getClinicReports } from "@/server/queries/reports";
import { getDateRangeFromParams } from "@/lib/utils/date-ranges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import {
  StatusPieChart,
  TopServicesChart,
  DoctorUtilizationChart,
  SourceBreakdownChart
} from "@/components/reports/appointment-charts";
import {
  AiConversationStatusChart,
  TopMessageSourcesChart
} from "@/components/reports/ai-stats-charts";

function formatPHP(centavos: number) {
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 1000) / 10}%`;
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profileHasPermission(profile, "appointments:view_all")) redirect("/dashboard");

  const { period, from, to } = await searchParams;
  const dateRange = getDateRangeFromParams(period, from, to);
  const data = await getClinicReports(dateRange);

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-500">
        Reports unavailable. Please check your permissions.
      </div>
    );
  }

  const { appointments: appt, ai } = data;
  const completionRate = pct(appt.completed, appt.total);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            {dateRange.label} — clinic analytics and performance metrics
          </p>
        </div>
        <Suspense>
          <DateRangeFilter period={dateRange.period} from={dateRange.fromParam} to={dateRange.toParam} />
        </Suspense>
      </div>

      {/* ─── Appointment KPIs ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Appointments
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Appointments"
            value={appt.total.toLocaleString()}
            detail={`${dateRange.label}`}
            icon={Activity}
          />
          <StatCard
            label="Completed"
            value={appt.completed.toLocaleString()}
            detail={`Completion rate: ${completionRate}`}
            icon={CalendarCheck}
          />
          <StatCard
            label="Cancelled"
            value={appt.cancelled.toLocaleString()}
            detail={`${pct(appt.cancelled, appt.total)} of total`}
            icon={CalendarX}
          />
          <StatCard
            label="No-Shows"
            value={appt.noShow.toLocaleString()}
            detail={`${pct(appt.noShow, appt.total)} of total`}
            icon={UserCheck}
          />
        </div>
      </section>

      {/* ─── Revenue & Patients ───────────────────────────────────── */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue (Completed)"
            value={formatPHP(appt.revenueCentavos)}
            detail="From completed appointments"
            icon={Wallet}
          />
          <StatCard
            label="New Patients"
            value={appt.newPatients.toLocaleString()}
            detail={`Registered ${dateRange.label.toLowerCase()}`}
            icon={Users}
          />
          <StatCard
            label="Total Patients"
            value={appt.totalPatients.toLocaleString()}
            detail="All time in clinic"
            icon={Users}
          />
          <StatCard
            label="AI-Generated Bookings"
            value={appt.aiSourced.toLocaleString()}
            detail={`${pct(appt.aiSourced, appt.total)} of total bookings`}
            icon={Zap}
          />
        </div>
      </section>

      {/* ─── Charts row 1 ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={appt.statusBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Source Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceBreakdownChart data={appt.sourceBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts row 2 ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Booked Services</CardTitle>
          </CardHeader>
          <CardContent>
            <TopServicesChart data={appt.topServices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <DoctorUtilizationChart data={appt.doctorStats} />
          </CardContent>
        </Card>
      </div>

      {/* ─── Services table ───────────────────────────────────────── */}
      {appt.topServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Service</th>
                    <th className="pb-3 pr-4 text-right">Bookings</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {appt.topServices.map((s) => (
                    <tr key={s.serviceId} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{s.serviceName}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{s.count.toLocaleString()}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{formatPHP(s.revenueCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Doctor utilization table ─────────────────────────────── */}
      {appt.doctorStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Doctor</th>
                    <th className="pb-3 pr-4 text-right">Total</th>
                    <th className="pb-3 pr-4 text-right">Completed</th>
                    <th className="pb-3 text-right">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {appt.doctorStats.map((d) => (
                    <tr key={d.doctorId} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{d.doctorName}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{d.total}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{d.completed}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{pct(d.completed, d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── AI Analytics ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          AI Assistant Analytics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Conversations"
            value={ai.totalConversations.toLocaleString()}
            detail={`${dateRange.label}`}
            icon={Bot}
          />
          <StatCard
            label="Bookings via AI"
            value={ai.bookingsGenerated.toLocaleString()}
            detail={`Conversion rate: ${ai.aiConversionRate}%`}
            icon={TrendingUp}
          />
          <StatCard
            label="Human Handoffs"
            value={ai.handoffConversations.toLocaleString()}
            detail={`Handoff rate: ${ai.handoffRate}%`}
            icon={UserCheck}
          />
          <StatCard
            label="Avg Messages / Conv"
            value={ai.avgMessagesPerConversation.toString()}
            detail="Per AI conversation"
            icon={Activity}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Conversation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <AiConversationStatusChart data={ai} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top AI Response Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <TopMessageSourcesChart data={ai.topMessageSources} />
          </CardContent>
        </Card>
      </div>

      {/* ─── AI Summary table ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Conversation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Open Conversations", value: ai.openConversations },
              { label: "Booked via AI", value: ai.bookedConversations },
              { label: "Handed off to Staff", value: ai.handoffConversations },
              { label: "Closed Conversations", value: ai.closedConversations },
              { label: "AI Conversion Rate", value: `${ai.aiConversionRate}%` },
              { label: "Handoff Rate", value: `${ai.handoffRate}%` }
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{String(item.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
