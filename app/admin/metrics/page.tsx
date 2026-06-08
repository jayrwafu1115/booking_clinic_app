import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPlatformMetrics, getAllClinicsAdmin } from "@/server/queries/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminMetricsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const [metrics, clinics] = await Promise.all([getPlatformMetrics(), getAllClinicsAdmin()]);

  if (!metrics) {
    return <div className="p-8 text-center text-slate-500">Unable to load metrics.</div>;
  }

  // Build subscription breakdown
  const subBreakdown = [
    { label: "Trial", count: metrics.trial_subscriptions, bg: "bg-orange-50", text: "text-orange-700" },
    { label: "Active", count: metrics.active_subscriptions, bg: "bg-green-50", text: "text-green-700" },
    { label: "Past Due", count: metrics.past_due_subscriptions, bg: "bg-red-50", text: "text-red-700" },
    { label: "Cancelled", count: metrics.cancelled_subscriptions, bg: "bg-slate-50", text: "text-slate-600" }
  ];

  // Top clinics by appointments
  const topByAppointments = [...clinics].sort((a, b) => Number(b.appointment_count) - Number(a.appointment_count)).slice(0, 10);
  const topByAI = [...clinics].sort((a, b) => Number(b.ai_conversation_count) - Number(a.ai_conversation_count)).slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Platform Metrics</h1>
        <p className="mt-1 text-sm text-slate-500">Detailed SaaS analytics</p>
      </div>

      {/* Subscription breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {subBreakdown.map((item) => (
              <div key={item.label} className={`rounded-xl ${item.bg} p-4`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className={`mt-1 text-3xl font-bold ${item.text}`}>{item.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top clinics by appointments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Clinics by Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topByAppointments.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {Number(c.appointment_count).toLocaleString()}
                  </span>
                </div>
              ))}
              {topByAppointments.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No data</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Clinics by AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topByAI.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-purple-600">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {Number(c.ai_conversation_count).toLocaleString()}
                  </span>
                </div>
              ))}
              {topByAI.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
