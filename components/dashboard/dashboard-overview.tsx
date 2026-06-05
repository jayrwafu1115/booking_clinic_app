import { Bot, CalendarCheck, CalendarClock, CircleDollarSign, Users, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./stat-card";

const stats = [
  { label: "Appointments Today", value: "32", detail: "8 pending confirmation", icon: CalendarCheck },
  { label: "Upcoming", value: "118", detail: "Next 7 Manila-time days", icon: CalendarClock },
  { label: "Total Patients", value: "2,840", detail: "64 added this month", icon: Users },
  { label: "Revenue This Month", value: "PHP 428,500", detail: "Stored as centavos in DB", icon: CircleDollarSign },
  { label: "AI Bookings", value: "76", detail: "Captured from chat widget", icon: Bot },
  { label: "No Show Rate", value: "4.8%", detail: "Down 1.2% from last month", icon: UserX }
];

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Asia/Manila workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Dashboard</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Static foundation data for Phase 1. Production queries can plug into these components once appointments, billing, and AI booking records are added.
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
            <div className="space-y-4">
              {["08:30 AM Dental cleaning", "10:00 AM General consultation", "01:30 PM Aesthetic follow-up", "04:15 PM PT assessment"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Confirmed</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI booking snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">GCash-ready PayMongo billing planned</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Phase 1 keeps billing secrets server-side and reserves PHP defaults for future subscription plans.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-2xl font-semibold text-slate-950">91%</p>
                <p className="text-sm text-slate-500">Intent matched</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-2xl font-semibold text-slate-950">14</p>
                <p className="text-sm text-slate-500">Escalated chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
