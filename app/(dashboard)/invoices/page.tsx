import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInvoicesData } from "@/server/queries/invoices";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft:  "bg-slate-100 text-slate-600",
  sent:   "bg-blue-50 text-blue-700",
  paid:   "bg-green-50 text-green-700",
  void:   "bg-red-50 text-red-500",
};

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const data = await getInvoicesData(await searchParams);
  if (!data) return <AccessCard title="Invoices" message="Sign in with a clinic account to manage invoices." />;

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Billing"
        title="Invoices"
        description="Generate and manage patient invoices and payment records."
        icon={FileText}
        action={data.canManage ? { href: "/invoices/new", label: "New invoice", icon: Plus } : undefined}
      />

      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap gap-3">
            <input name="q" defaultValue={""} placeholder="Invoice number…" className="h-10 rounded-xl border border-input px-3 text-sm flex-1 min-w-[160px]" />
            <select name="status" className="h-10 rounded-xl border border-input px-3 text-sm">
              <option value="">All statuses</option>
              {["draft","sent","paid","void"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {data.invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" description="Create your first invoice." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-800">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-slate-700">{inv.patients?.full_name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[inv.status] ?? "bg-slate-100"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">{php(inv.total_centavos)}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(inv.created_at).toLocaleDateString("en-PH")}</td>
                    <td className="px-5 py-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/invoices/${inv.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {data.page} of {data.totalPages} · {data.total} invoices</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/invoices?page=${Math.max(data.page - 1, 1)}`}>Previous</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/invoices?page=${Math.min(data.page + 1, data.totalPages)}`}>Next</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
