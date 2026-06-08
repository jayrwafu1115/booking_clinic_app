import { redirect } from "next/navigation";
import { Bot, TrendingUp } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAiUsageByClinic } from "@/server/queries/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 1000) / 10}%`;
}

export default async function AdminAiUsagePage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const rows = await getAiUsageByClinic();

  const totals = rows.reduce(
    (acc, r) => ({
      conversations: acc.conversations + r.total_conversations,
      booked: acc.booked + r.booked_conversations,
      handoff: acc.handoff + r.handoff_conversations,
      messages: acc.messages + r.total_messages
    }),
    { conversations: 0, booked: 0, handoff: 0, messages: 0 }
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">AI Usage</h1>
        <p className="mt-1 text-sm text-slate-500">AI conversation stats across all clinics</p>
      </div>

      {/* Platform totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Conversations", value: totals.conversations.toLocaleString() },
          { label: "Booked via AI", value: totals.booked.toLocaleString() },
          { label: "Handoffs", value: totals.handoff.toLocaleString() },
          { label: "Total Messages", value: totals.messages.toLocaleString() }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI Usage by Clinic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Clinic</th>
                  <th className="pb-3 pr-4 text-right">Conversations</th>
                  <th className="pb-3 pr-4 text-right">Booked</th>
                  <th className="pb-3 pr-4 text-right">Conversion</th>
                  <th className="pb-3 pr-4 text-right">Handoffs</th>
                  <th className="pb-3 text-right">Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.clinic_id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{r.clinic_name}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{r.total_conversations.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{r.booked_conversations.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {pct(r.booked_conversations, r.total_conversations)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{r.handoff_conversations.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">{r.total_messages.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No AI usage data found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
