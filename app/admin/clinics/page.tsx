import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAllClinicsAdmin } from "@/server/queries/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700"
};

const SUB_BADGE: Record<string, string> = {
  trial: "bg-orange-100 text-orange-700",
  active: "bg-green-100 text-green-700",
  past_due: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700",
  none: "bg-slate-100 text-slate-500"
};

export default async function AdminClinicsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const clinics = await getAllClinicsAdmin();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Clinics</h1>
          <p className="mt-1 text-sm text-slate-500">{clinics.length} clinics on the platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            All Clinics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Clinic</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Subscription</th>
                  <th className="pb-3 pr-4 text-right">Users</th>
                  <th className="pb-3 pr-4 text-right">Appointments</th>
                  <th className="pb-3 pr-4 text-right">AI Convs</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.email ?? c.slug}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="space-y-0.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SUB_BADGE[c.subscription_status] ?? "bg-slate-100 text-slate-500"}`}>
                          {c.subscription_status}
                        </span>
                        {c.plan_name && (
                          <p className="text-xs text-slate-400">{c.plan_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-600">{Number(c.user_count).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-600">{Number(c.appointment_count).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-600">{Number(c.ai_conversation_count).toLocaleString()}</td>
                    <td className="py-3">
                      <Link
                        href={`/admin/clinics/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clinics.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No clinics found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
