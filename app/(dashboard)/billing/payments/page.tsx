import { ArrowUpRight, CreditCard, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaymentsData } from "@/server/queries/billing";
import type { PaymentRow } from "@/server/queries/billing";

export const dynamic = "force-dynamic";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(centavos / 100);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(iso));
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  widget: "Widget",
  ai: "AI",
  phone: "Phone",
  walk_in: "Walk-in"
};

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentTableRow({ row }: { row: PaymentRow }) {
  const source = SOURCE_LABELS[row.source] ?? row.source;
  return (
    <tr className="border-b border-border last:border-0 hover:bg-slate-50/60">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-slate-800">{row.patient_name ?? "—"}</p>
        <p className="text-xs text-slate-400">{formatDateTime(row.start_at)}</p>
      </td>
      <td className="py-3 pr-4">
        <p className="text-sm text-slate-700">{row.service_name ?? "—"}</p>
        {row.doctor_name && <p className="text-xs text-slate-400">{row.doctor_name}</p>}
      </td>
      <td className="py-3 pr-4">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {source}
        </span>
      </td>
      <td className="py-3 text-right">
        <span className="text-sm font-semibold text-green-700">{php(row.price_centavos)}</span>
      </td>
    </tr>
  );
}

export default async function PaymentsPage() {
  const data = await getPaymentsData();

  if (!data) {
    return <AccessCard title="Payments unavailable" message="Sign in with a clinic account to view payment records." />;
  }

  const avgCentavos = data.totalCount > 0 ? Math.round(data.totalCentavos / data.totalCount) : 0;

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Billing"
        title="Payments"
        description="Revenue from completed appointments. Mark an appointment as Completed to record a payment."
        icon={CreditCard}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="All-time revenue"
          value={php(data.totalCentavos)}
          sub={`${data.totalCount} completed appointment${data.totalCount !== 1 ? "s" : ""}`}
        />
        <StatCard
          icon={TrendingUp}
          label="This month"
          value={php(data.thisMonthCentavos)}
          sub="Completed appointments in current month"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Average per visit"
          value={avgCentavos > 0 ? php(avgCentavos) : "—"}
          sub="Based on completed appointments"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <Link href="/appointments" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View appointments →
          </Link>
        </CardHeader>
        <CardContent>
          {data.rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-600">No payments recorded yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Mark appointments as <span className="font-semibold">Completed</span> to see revenue here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Patient / Date</th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Service</th>
                    <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Source</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <PaymentTableRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
              {data.totalCount >= 200 && (
                <p className="mt-4 text-center text-xs text-slate-400">
                  Showing the 200 most recent payments. Full export coming soon.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400">
        PayMongo payment links and invoice generation coming soon.
      </p>
    </div>
  );
}
