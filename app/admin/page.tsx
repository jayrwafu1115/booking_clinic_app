import { redirect } from "next/navigation";
import {
  Activity,
  Bot,
  Building2,
  CheckCircle,
  CreditCard,
  PauseCircle,
  Timer,
  Users,
  XCircle
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPlatformMetrics } from "@/server/queries/super-admin";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString();
}

export default async function AdminDashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const metrics = await getPlatformMetrics();

  if (!metrics) {
    return (
      <div className="p-8 text-center text-slate-500">
        Unable to load platform metrics.
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Platform Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          SaaS-wide metrics across all clinics on ClinicFlow AI PH
        </p>
      </div>

      {/* ─── Clinic stats ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Clinics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Total Clinics" value={fmt(metrics.total_clinics)} icon={Building2} accent="blue" />
          <AdminStatCard label="Active Clinics" value={fmt(metrics.active_clinics)} icon={CheckCircle} accent="green" detail="Status: active" />
          <AdminStatCard label="Inactive" value={fmt(metrics.inactive_clinics)} icon={PauseCircle} accent="orange" detail="Status: inactive" />
          <AdminStatCard label="Suspended" value={fmt(metrics.suspended_clinics)} icon={XCircle} accent="red" detail="Status: suspended" />
        </div>
      </section>

      {/* ─── Subscription breakdown ───────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Subscriptions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Trial" value={fmt(metrics.trial_subscriptions)} icon={Timer} accent="orange" />
          <AdminStatCard label="Active / Paid" value={fmt(metrics.active_subscriptions)} icon={CreditCard} accent="green" />
          <AdminStatCard label="Past Due" value={fmt(metrics.past_due_subscriptions)} icon={XCircle} accent="red" />
          <AdminStatCard label="Cancelled" value={fmt(metrics.cancelled_subscriptions)} icon={PauseCircle} accent="purple" />
        </div>
      </section>

      {/* ─── Platform activity ────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Platform Activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Total Users" value={fmt(metrics.total_users)} icon={Users} accent="blue" detail="Active profiles" />
          <AdminStatCard label="Total Appointments" value={fmt(metrics.total_appointments)} icon={Activity} accent="blue" detail="All time" />
          <AdminStatCard label="AI Conversations" value={fmt(metrics.total_ai_conversations)} icon={Bot} accent="purple" detail="All time" />
          <AdminStatCard label="AI Messages" value={fmt(metrics.total_ai_messages)} icon={Bot} accent="purple" detail="All time" />
        </div>
      </section>

      {/* ─── Summary card ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Paid Conversion",
                value:
                  metrics.total_clinics > 0
                    ? `${Math.round((metrics.active_subscriptions / metrics.total_clinics) * 100)}%`
                    : "—",
                note: "Active paid / total clinics"
              },
              {
                label: "Trial Clinics",
                value:
                  metrics.total_clinics > 0
                    ? `${Math.round((metrics.trial_subscriptions / metrics.total_clinics) * 100)}%`
                    : "—",
                note: "Still on free trial"
              },
              {
                label: "Avg Appointments / Clinic",
                value:
                  metrics.total_clinics > 0
                    ? Math.round(metrics.total_appointments / metrics.total_clinics).toLocaleString()
                    : "—",
                note: "All time average"
              }
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{item.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
