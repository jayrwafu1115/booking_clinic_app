import { FileText } from "lucide-react";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { getInvoiceData } from "@/server/queries/invoices";

export const dynamic = "force-dynamic";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-50 text-blue-700",
  paid:  "bg-green-50 text-green-700",
  void:  "bg-red-50 text-red-500",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getInvoiceData(id);
    if (!data) return <AccessCard title="Invoice" message="Invoice not found or access denied." />;

    const { invoice } = data;
    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount_centavos, 0);
    const balance = invoice.total_centavos - totalPaid;

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Billing"
          title={invoice.invoice_number}
          description={`Invoice for ${invoice.patients?.full_name ?? "patient"}`}
          icon={FileText}
        />

        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_BADGE[invoice.status] ?? "bg-slate-100"}`}>
            {invoice.status}
          </span>
          {data.canManage && (
            <InvoiceActions
              invoice={invoice}
              patientId={invoice.patient_id}
              balance={balance}
            />
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Qty</th>
                      <th className="px-5 py-3 text-right">Unit price</th>
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoice.invoice_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 text-slate-800">{item.description}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{php(item.unit_price_centavos)}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-900">{php(item.total_centavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-100 bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-400">Subtotal</td>
                      <td className="px-5 py-3 text-right font-medium">{php(invoice.subtotal_centavos)}</td>
                    </tr>
                    {invoice.discount_centavos > 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-2 text-right text-xs font-semibold uppercase text-slate-400">Discount</td>
                        <td className="px-5 py-2 text-right text-green-600">−{php(invoice.discount_centavos)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right text-sm font-bold text-slate-700">Total</td>
                      <td className="px-5 py-3 text-right text-base font-bold text-slate-950">{php(invoice.total_centavos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>

            {invoice.payments.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                <CardContent className="divide-y divide-slate-100">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="flex justify-between py-3 text-sm">
                      <div>
                        <span className="font-medium capitalize text-slate-800">{p.method.replace("_", " ")}</span>
                        {p.reference_no && <span className="ml-2 text-slate-400">Ref: {p.reference_no}</span>}
                        <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString("en-PH")}</p>
                      </div>
                      <span className="font-semibold text-green-700">{php(p.amount_centavos)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 text-sm font-bold">
                    <span className="text-slate-700">Balance due</span>
                    <span className={balance > 0 ? "text-red-600" : "text-green-700"}>{php(Math.max(0, balance))}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="h-fit">
            <CardHeader><CardTitle>Patient</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{invoice.patients?.full_name}</p>
              <p>{invoice.patients?.phone}</p>
              {invoice.patients?.email && <p>{invoice.patients.email}</p>}
              {invoice.due_date && (
                <p className="mt-3 text-xs text-slate-400">
                  Due: {new Date(invoice.due_date).toLocaleDateString("en-PH")}
                </p>
              )}
              {invoice.notes && (
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs">{invoice.notes}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load invoice.";
    return <AccessCard title="Invoice could not load" message={message} />;
  }
}
