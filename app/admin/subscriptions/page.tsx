import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAllClinicsAdmin } from "@/server/queries/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EditSubscriptionForm } from "./edit-subscription-form";
import type { SubscriptionPlan } from "@/types/database";

const SUB_BADGE: Record<string, string> = {
  trial:     "bg-orange-100 text-orange-700",
  active:    "bg-green-100 text-green-700",
  past_due:  "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700",
  none:      "bg-slate-100 text-slate-500"
};

export default async function AdminSubscriptionsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const [clinics, plansResult] = await Promise.all([
    getAllClinicsAdmin(),
    supabase
      .from("subscription_plans")
      .select("id, name, price_monthly_centavos")
      .eq("active", true)
      .order("price_monthly_centavos", { ascending: true })
      .returns<Pick<SubscriptionPlan, "id" | "name" | "price_monthly_centavos">[]>()
  ]);

  const plans = plansResult.data ?? [];

  const summary = clinics.reduce<Record<string, number>>((acc, c) => {
    acc[c.subscription_status] = (acc[c.subscription_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">Manage subscription status across all clinics</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(summary).map(([status, count]) => (
          <div key={status} className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{status}</p>
            <p className="text-xl font-bold text-slate-950">{count}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Clinic Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Clinic</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Trial Ends</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email ?? c.slug}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{c.plan_name ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SUB_BADGE[c.subscription_status] ?? "bg-slate-100 text-slate-500"}`}>
                        {c.subscription_status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {c.trial_ends_at ? new Date(c.trial_ends_at).toLocaleDateString("en-PH") : "—"}
                    </td>
                    <td className="py-2.5">
                      <EditSubscriptionForm clinic={c} plans={plans} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clinics.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No data</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
